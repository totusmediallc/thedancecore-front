# Contexto general del proyecto

## Resumen

- **Proyecto**: Panel administrativo de THEDANCECORE.
- **Stack principal**: React 19 + Vite + CoreUI 5.
- **Objetivo**: ofrecer un dashboard con modo claro/oscuro, navegación lateral y módulos demo del template `CoreUI React Dashboard` adaptado a las necesidades del negocio.

## Estructura relevante

```
src/
├─ App.js                 → Configura rutas con React Router (HashRouter)
├─ context/AuthContext.jsx → Estado global de autenticación
├─ hooks/useAuth.js        → Hook de acceso al contexto de auth
├─ services/               → Cliente HTTP, API de auth y persistencia
├─ layout/DefaultLayout.js → Shell general con sidebar, header y content
├─ components/             → Elementos reutilizables (header, sidebar, etc.)
├─ views/                  → Pantallas del template (dashboard, login, etc.)
└─ config/apiConfig.js     → Variables de configuración para peticiones
```

El router protege todo lo que cuelga de `DefaultLayout` mediante `ProtectedRoute`, por lo que el login vive fuera del layout general.

## Módulo de autenticación

- Login consumiendo backend NestJS (`/api/auth/login`).
- Tokens y usuario guardados en `localStorage` (clave `thedancecore.auth.session`).
- Refresco automático/reactivo gestionado en `AuthContext` + `httpClient`.
- Logout vía `/api/auth/logout`.
- Dropdown del header muestra datos del usuario y permite cerrar sesión.

### Variables de entorno clave

- `VITE_API_BASE_URL`: URL base del backend (`.env.development`, `.env.production`).
- `VITE_API_TIMEOUT`: timeout global en ms.

## Flujo de navegación

1. Usuario anónimo es redirigido a `#/login`.
2. Tras autenticarse, se navega al dashboard (`#/dashboard`) o a la ruta solicitada originalmente.
3. Mientras se reconstruye la sesión en recargas, `ProtectedRoute` muestra un loader.
4. El usuario puede cerrar sesión desde el header.

## Próximos pasos sugeridos

- Implementar CRUD de usuarios usando los endpoints `/api/users` (pendiente según la planificación).
- Añadir guardas de rol (`admin`/`client`) en el frontend cuando existan pantallas sensibles.
- Completar módulos del dashboard reemplazando datos de ejemplo por datos reales del backend.

## Recursos adicionales

- **Template base**: [CoreUI React Dashboard Template](https://coreui.io/react/)
- **Backend**: NestJS con JWT (ver documentación provista en la tarea original).

Mantener este documento sincronizado cuando se agreguen nuevos módulos, rutas protegidas o configuraciones de entorno.
