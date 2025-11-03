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

## Convenciones de commit (Commitlint)

Este repo valida los mensajes de commit con Commitlint. Usa el formato:

- type(scope): subject
- Body (opcional): más detalle en líneas siguientes
- Footer (opcional): BREAKING CHANGE: descripción

Tipos comunes: feat, fix, chore, refactor, docs, style, test, ci, build, perf, revert.

Scopes permitidos (resumen útil):

- @vben/web-antd, @vben/backend-mock, @vben/request, @vben/locales, @vben/preferences, @vben/stores, @vben/plugins, @vben/utils
- project, style, lint, ci, dev, deploy, other

Si cambias varias áreas a la vez, puedes usar el scope general `project`.

### Formas fáciles o guiadas

1) Asistente interactivo (recomendado):

```
pnpm commit
```

Si tu entorno no tiene el asistente disponible, usa una de estas opciones equivalentes:

```
pnpm dlx czg
# o
npx czg
```

El asistente te pide: type → scope → subject → body → footer. Elige un scope de la lista anterior. El commit se crea con el formato correcto.

2) Manual, con ejemplos listos:

- Nueva funcionalidad en la app (p. ej., Users/Settings)

```
git add apps/web-antd/src/views/users/index.vue apps/web-antd/src/views/settings/index.vue
git commit -m "feat(@vben/web-antd): añadir CRUD de usuarios y ajustes" -m "Incluye modal con AntD y recarga de grid tras guardar."
```

- Arreglo en interceptores (refresh token 401)

```
git add packages/effects/request/src/request-client/preset-interceptors.ts
git commit -m "fix(@vben/request): refresco de token ante 401" -m "Evita bucles y reintenta una vez; añade Accept-Language."
```

- Solo formato/lint global (Prettier/ESLint)

```
git add -A
git commit -m "style(lint): aplicar Prettier y ordenar imports"
```

- Documentación del proyecto

```
git add README.TDC.md
git commit -m "docs(project): instrucciones de dev, envs y proxy"
```

- Refactor en stores (timezone)

```
git add packages/stores/src/modules/timezone.ts
git commit -m "refactor(@vben/stores): inicialización segura de timezone" -m "Maneja errores al iniciar y usa setDefault correctamente."
```

- Cambios en varias carpetas (scope general)

```
git add apps/web-antd/src/preferences.ts packages/@core/preferences/src/config.ts
git commit -m "chore(project): alinear i18n por defecto a es-ES" -m "Actualiza preferencias y locales de AntD/dayjs."
```

- Cambio rompedor (breaking change)

```
git add apps/web-antd/src/router/routes/*.ts
git commit -m "feat(@vben/web-antd)!: cambiar rutas base a /admin" -m "BREAKING CHANGE: las rutas pasan de /dashboard/* a /admin/*."
```

- Flujo completo típico (una sola área)

```
git add apps/web-antd/src/api/admin/settings.ts
git commit -m "feat(@vben/web-antd): endpoint de guardado de ajustes" -m "PUT /api/settings y notificaciones de éxito/error."
git push -u origin main
```

Notas:

- Evita `--no-verify` salvo urgencia (saltaría los hooks y perderíamos validación).
- Si commitlint rechaza tu scope, usa uno permitido (p. ej. `@vben/web-antd` o `project`).
