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

### Renombrado de módulo de academias → gestión

La carpeta anterior `src/views/academias` fue reemplazada por `src/views/gestion` para agrupar funcionalidades relacionadas (academias, competidores, géneros, categorías, etc.). Las rutas oficiales viven bajo `/gestion/*` y las antiguas `/academias/*` han sido retiradas.

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

- Mantener y evolucionar el CRUD de usuarios implementado en `#/configuraciones/usuarios`, incorporando mejoras de experiencia y seguridad según feedback del negocio.
- Consolidar la gestión de academias desde una única vista que permita listar, crear, editar y eliminar con controles de rol y formularios validados.
- Añadir guardas de rol (`admin`/`client`) en el frontend cuando existan pantallas sensibles adicionales.
- Completar módulos del dashboard reemplazando datos de ejemplo por datos reales del backend.

## Administración de usuarios (`#/configuraciones/usuarios`)

- Disponible únicamente para cuentas con rol `admin`. Los usuarios con otros roles verán un mensaje de acceso restringido.
- Se puede acceder directamente desde la URL `http://localhost:3000/#/configuraciones/usuarios` o a través del ítem **Configuraciones → Usuarios del sistema** en el sidebar.
- Incluye buscador, filtros por rol/estado, paginación y acciones para crear, editar o desactivar usuarios. Las modales controlan automáticamente permisos sensibles (por ejemplo, impedir desactivar al usuario autenticado).
- Tras ejecutar una acción, la vista refresca los datos y muestra feedback contextual (éxitos o errores reportados por la API).

## Gestión de academias (`#/gestion/academias`)

- Vista única para administración de academias. El listado incluye filtros en cliente (búsqueda global, estado/municipio/colonia y disponibilidad de sitio web) y paginación local. (Ruta renombrada desde `#/academias/listado`).
- Solo los administradores (`admin`) pueden crear, editar o eliminar; los usuarios con otros roles acceden en modo lectura y reciben un aviso sobre permisos restringidos.
- El formulario modal valida campos obligatorios (`name`, `contactPhoneNumber`, `mail`, `colonyId`, `googlemaps`) y URLs opcionales (`web`, `logo`). El flujo de ubicación usa selectores dependientes alimentados por `/locations/states`, `/locations/municipalities` y `/locations/colonies`, permitiendo filtrar escribiendo mientras se buscan municipios o colonias.
- Las acciones sensibles (guardar/eliminar) muestran retroalimentación contextual y una confirmación dedicada antes de borrar registros (hard delete en backend).

## Gestión de eventos (`#/events`)

- Nueva vista autónoma que antecede al menú **Gestión** y centraliza la administración de eventos de la agencia.
- El listado soporta búsqueda libre, filtros por estado/municipio/colonia, rango de fechas, estado temporal (Próximo/En curso/Finalizado/Borrador) y paginación local (10/20/50 ítems).
- Todos los usuarios autenticados pueden consultar el detalle; únicamente el rol `admin` puede crear, editar o eliminar. Los usuarios sin permisos ven un aviso informativo y los botones de acción quedan deshabilitados.
- El formulario modal consume `/locations/*` para poblar selectores dependientes, valida rango de fechas (`startDate`/`endDate`) y campo `colonyId`, permite registrar una dirección textual y editar el campo `data` (JSON libre para metadatos como precios, notas logísticas, etc.).
- El banner se sube vía multipart a `/events` / `/events/:id` con validaciones en cliente: solo JPG o PNG de hasta 12 MB, vista previa, opción para optimizar (re-escala a 1600×900 a ~90 % de calidad) y limpieza del archivo antes de enviar. Si no se adjunta uno nuevo durante un `PATCH` se conserva la imagen existente.
- Desde el listado se puede abrir el banner público (concatenando `API_BASE_URL` + `banner`) y lanzar una búsqueda en Google Maps construida con dirección, colonia y estado. Cada acción sensible está envuelta en `CModal` con confirmación y feedback contextual.

## Recursos adicionales

- **Template base**: [CoreUI React Dashboard Template](https://coreui.io/react/)
- **Backend**: NestJS con JWT (ver documentación provista en la tarea original).

Mantener este documento sincronizado cuando se agreguen nuevos módulos, rutas protegidas o configuraciones de entorno.
