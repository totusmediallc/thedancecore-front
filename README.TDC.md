# The Dance Core Admin (Vue 3 + Vite + Vben Admin)

Este repo contiene un panel administrativo basado en la plantilla "vue-vben-admin" (Ant Design Vue).

## Requisitos

- Node.js >= 20.10
- pnpm >= 9.12 (ya auto-configurado localmente en este repo)

## Variables de entorno

Edita las variables en `apps/web-antd/.env.development` y `apps/web-antd/.env.production`.

- `VITE_GLOB_API_URL`: URL base de la API. En desarrollo se deja `/api` y Vite proxeará a `http://localhost:3000`.
- `VITE_GLOB_APP_TITLE`: Título de la app. Por defecto: `The Dance Core Admin`.

Ejemplo dev (`apps/web-antd/.env.development`):

```
VITE_GLOB_API_URL=/api
VITE_GLOB_APP_TITLE="The Dance Core Admin"
VITE_NITRO_MOCK=false
```

Ejemplo prod (`apps/web-antd/.env.production`):

```
VITE_GLOB_API_URL=https://api.example.com
VITE_GLOB_APP_TITLE="The Dance Core Admin"
```

## Proxy de desarrollo

Vite proxea `/api` a `http://localhost:3000`. Cambia el target en `apps/web-antd/vite.config.mts` si tu API corre en otro puerto.

## Comandos

Desde la raíz del repo:

- `pnpm dev`: levanta el monorepo (usa Turbo). Para solo Ant Design:
  - `pnpm dev:antd`
- `pnpm build`: compila todo
- `pnpm preview`: preview de los apps (usa Turbo)
- `pnpm gen:api`: genera los tipos de OpenAPI para `apps/web-antd` desde `http://localhost:3000/api-json` a `src/api/generated/openapi.d.ts`.

## Autenticación

- Login con email/password (ruta `POST /auth/login`).
- El access token (JWT) se envía en `Authorization: Bearer <token>` automáticamente.
- Refresh token: `POST /auth/refresh` (con cookies). Si falla el refresh tras un 401, se hace logout automático.

Ajusta `src/api/core/auth.ts` si tu API tiene rutas/campos distintos.

## Estructura relevante

- `apps/web-antd/src/api` → cliente HTTP central y endpoints (axios envuelto via `@vben/request`).
- `apps/web-antd/src/stores` → Pinia (auth, user, etc.).
- `apps/web-antd/src/router` → rutas protegidas y guardas.
- `apps/web-antd/src/views` → páginas (Users, Reports, Settings).
- `apps/web-antd/src/hooks` → hooks (p. ej. `useUsers`).

## i18n

- Idioma por defecto: `es-ES` (Ant Design + dayjs configurados).
- Archivos de traducción en `apps/web-antd/src/locales/langs`.

## Notas de API de ejemplo

- Usuarios: `/users` (GET paginado, POST, PATCH /:id, DELETE /:id)
- Reportes: `/reports/sales`, `/reports/users-by-role`, `/reports/active-users`
- Settings: `/settings` (GET, PUT)

Adapta las rutas a tu NestJS según sea necesario.
