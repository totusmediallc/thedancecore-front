# Contexto de autenticación del panel

Este documento resume el flujo completo de autenticación implementado en el panel React basado en CoreUI. La intención es ofrecer un mapa claro para mantener y extender el inicio de sesión, la gestión de sesión y la integración con el backend NestJS.

## Endpoints y variables de entorno

- **Base URL**: definida por `VITE_API_BASE_URL` (ver `.env.development`, `.env.production` y `.env.example`).
  - Valor por defecto en desarrollo: `http://localhost:3000/api`.
- **Timeout de peticiones**: `VITE_API_TIMEOUT` (valor por defecto: `20000` ms).
- Endpoints utilizados:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/profile` (disponible para futuras sincronizaciones).

Todos los requests se construyen en `src/services/httpClient.js`, que centraliza la comunicación HTTP y el refresco automático de tokens.

## Arquitectura del cliente de autenticación

```
AuthProvider (src/context/AuthContext.jsx)
│
├─ usa authApi (src/services/authApi.js)
│    ├─ login → POST /auth/login
│    ├─ logout → POST /auth/logout
│    └─ refreshSession → POST /auth/refresh
│
├─ usa authStorage (src/services/authStorage.js)
│    ├─ Persistencia en localStorage (clave `thedancecore.auth.session`)
│    ├─ Manejo en memoria de tokens y usuario
│    └─ Cálculo de expiraciones a partir del `exp` del JWT
│
└─ orquesta refresh automático + estado global de sesión
```

El `AuthProvider` envuelve toda la aplicación (ver `src/index.js`) y expone el hook `useAuth` (`src/hooks/useAuth.js`) para acceder a `user`, `isAuthenticated`, `login`, `logout`, etc.

## Flujo de login

1. El formulario en `src/views/pages/login/Login.js` invoca `login(credentials)` del contexto.
2. `AuthProvider` llama a `authApi.login`, recibe `{ user, accessToken, refreshToken, ... }` y delega a `saveSessionPayload` para persistir:
   - `accessToken`
   - `refreshToken`
   - Fechas de expiración (`accessTokenExpiresAt`, `refreshTokenExpiresAt`)
   - Datos del usuario serializados
3. Tras persistir, se programa un refresco automático antes de que expire el access token.
4. El usuario es redirigido al dashboard o a la ruta solicitada originalmente.

El componente de login muestra mensajes de error basados en `HttpError` y bloquea el submit mientras espera respuesta.

## Persistencia y refresco automático

- **Persistencia**: `authStorage.saveSessionPayload` guarda la sesión en localStorage y en memoria. Se lee al iniciar la app (`loadPersistedSession`).
- **Refresco proactivo**: el `AuthProvider` programa `setTimeout` para ejecutar `refreshSession` un minuto antes de que caduque el access token. Si el token ya está caducado al restaurar la app, se fuerza un refresh inmediato.
- **Refresco reactivo**: `httpClient` intercepta respuestas `401` y, si es posible, intenta `POST /auth/refresh` de manera transparente antes de repetir la petición original.
- **Invalidación**: cualquier error en el refresh (token inválido, expiración, timeout) limpia la sesión (`clearSession`) y deja al usuario no autenticado.

## Manejo del logout

- `logout()` hace `POST /auth/logout` con el access token vigente.
- Independientemente del resultado, se limpia el estado local y el storage.
- La UI (dropdown del header) muestra un estado de "Cerrando sesión…" cuando el refresh automático está en progreso para evitar acciones concurrentes.

## Protección de rutas y UI

- `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) protege todas las rutas hijas de `DefaultLayout`. Si la sesión no está lista, muestra un spinner centralizado; si la sesión es inválida, redirige a `/login` con la ruta original en el estado de navegación.
- `AppHeaderDropdown` (`src/components/header/AppHeaderDropdown.js`) se alimenta de `useAuth` para mostrar nombre, email e iniciar el cierre de sesión.
- El resto de componentes pueden usar `useAuth` para validar permisos según el `role` incluido en el usuario.

## Consideraciones

- Los tokens se almacenan en localStorage (no existe cookie httpOnly disponible). Es responsabilidad del frontend invalidar la sesión al detectar actividad sospechosa.
- El timeout global se puede ajustar vía `VITE_API_TIMEOUT`.
- `fetchProfile` está listo para sincronizar datos del usuario si en algún momento el backend añade información adicional que no venga en `login/refresh`.
- Al extender este módulo (ej. roles avanzados, expiración o recordatorios), documentar los cambios aquí para mantener alineado al equipo y a futuras automatizaciones.
