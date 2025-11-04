# Contexto de Autenticación en The Dance Core Admin

Este documento describe cómo el panel de administración (aplicación `apps/web-antd`) se integra con el backend NestJS para manejar autenticación basada en JWT, la persistencia de sesión y el refresco de tokens.

## Flujo general de autenticación

1. El formulario de inicio de sesión envía `email` y `password` a `POST /api/auth/login` mediante `loginApi`.
2. El backend responde con:
   - `user`: datos del usuario interno (`id`, `email`, nombres, rol, banderas de estado).
   - `accessToken`: JWT con vencimiento corto (15 minutos por defecto).
   - `refreshToken`: JWT con vencimiento largo (7 días por defecto).
   - `tokenType` y `expiresIn` (informativo).
3. El `AuthStore` guarda los tokens y sus tiempos de expiración (decodificando el `exp` del JWT) en el `AccessStore` persistido.
4. Se construye el objeto `UserInfo` utilizado por la plantilla y se guarda en el `UserStore` junto con los roles disponibles. También se rellenan los códigos de acceso (actualmente equivalentes a los roles).
5. Se redirige al usuario a la `homePath` configurada o al valor por defecto definido en preferencias.

## Almacenamiento y persistencia de tokens

- Los tokens (`accessToken` y `refreshToken`) se guardan en el `AccessStore` y se persisten en localStorage (en desarrollo) o cifrados con `secure-ls` (en producción).
- Se calculan y guardan las marcas de tiempo `accessTokenExpiresAt` y `refreshTokenExpiresAt` utilizando la utilería `getTokenExpiration` (`src/utils/auth.ts`).
- Estas marcas permiten detectar tokens expirados incluso después de recargar el navegador.

## Refresco de tokens

- `requestClient` revisa, antes de cada petición autenticada, si el `accessToken` expirará en los siguientes 60 segundos (`TOKEN_REFRESH_THRESHOLD`).
- Si el `refreshToken` sigue vigente, el cliente evita peticiones paralelas utilizando una cola interna y solicita un nuevo par de tokens mediante `POST /api/auth/refresh`.
- Tras el refresco:
  - Se actualizan tokens y expiraciones en el `AccessStore`.
  - Las peticiones en cola reciben el nuevo token.
- Si el `refreshToken` ha caducado, se forza la salida del usuario y se limpia el estado.
- Como respaldo, la respuesta `401` también dispara la lógica de refresco provista por el interceptor `authenticateResponseInterceptor` del paquete base.

## Cierre de sesión

- `logout()` del `AuthStore` llama a `POST /api/auth/logout` con el `accessToken` vigente.
- Independientemente del resultado, se limpian los stores (`resetAllStores`) y las expiraciones registradas.
- El usuario es redirigido a la pantalla de login con la ruta actual en la query `redirect` para facilitar el regreso.

## Recuperación de sesión al recargar

- Si existen tokens persistidos, el guard de router (`router/guard.ts`) invoca `fetchUserInfo()`.
- Esta función llama a `GET /api/auth/profile`, reconstruye el `UserInfo` y actualiza roles/códigos de acceso.
- Si los tokens han expirado, la primera petición autenticada hará que el interceptor de solicitudes fuerce un refresco o cierre de sesión según corresponda.

## Variables de entorno relevantes

Archivo `.env.development`:

```ini
VITE_GLOB_API_URL=http://localhost:3000/api
VITE_NITRO_MOCK=false
VITE_BYPASS_LOGIN=false
```

Archivo `.env.production`:

```ini
VITE_GLOB_API_URL=/api
```

- Ajusta `VITE_GLOB_API_URL` según la URL pública del backend en cada entorno.
- Mantén `VITE_BYPASS_LOGIN=false` para evitar accesos sin backend.

## Utilerías clave

- `src/utils/auth.ts`
  - `decodeJwtPayload`, `getTokenExpiration`, `isTokenExpiringSoon`: manejo de tiempos de vida de los tokens.
  - `mapBackendUserToUserInfo`: adapta la respuesta del backend al formato esperado por la plantilla.
  - `deriveAccessCodes`: expone los roles como códigos de acceso.

## Consideraciones adicionales

- Si el backend introduce permisos más granulars, actualiza `deriveAccessCodes` y la lógica del store para reflejarlo.
- Las notificaciones de éxito/fracaso se muestran usando `notification` de Ant Design Vue en `auth.ts`.
- Para deshabilitar temporalmente la autenticación (p. ej. demos), se puede activar `VITE_BYPASS_LOGIN=true`, lo que inyecta tokens ficticios por una hora.

Mantén este documento actualizado cuando se modifiquen endpoints, estructuras de respuesta o políticas de expiración.
