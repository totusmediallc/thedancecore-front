# Contexto General del Proyecto

Este repositorio es un monorepo basado en **Vue Vben Admin 5** que alberga diferentes aplicaciones front-end. El panel principal que utilizamos es `apps/web-antd`, construido con Vue 3 + TypeScript, Vite y la librería de componentes Ant Design Vue.

## Estructura relevante

- `apps/web-antd`: panel de administración para The Dance Core.
  - `src/api`: clientes HTTP organizados por dominio (`core/auth.ts`, `core/user.ts`, etc.).
  - `src/store`: stores de Pinia que encapsulan la autenticación, usuarios, accesos dinámicos y otros estados globales.
  - `src/router`: rutas y guards, incluyendo la generación dinámica de menús según roles.
  - `src/utils`: utilidades propias del proyecto (se añadió `auth.ts` para la gestión de tokens).
- `packages/*`: paquetes compartidos por todas las apps (stores base, preferencias, estilos, hooks, etc.).
- `docs/`: documentación adicional (este archivo y `auth_context.md`).

## Stack y preferencias

- **Framework:** Vue 3 con composición API.
- **Build:** Vite.
- **Estado global:** Pinia con persistencia cifrada en producción (SecureLS).
- **UI:** Ant Design Vue.
- **Internacionalización:** i18n provisto por el template, idioma por defecto forzado a `es-ES` en `src/preferences.ts`.
- **Gestión de rutas:** Vue Router con guards configurados en `src/router/guard.ts`.

## Módulo de autenticación

- Login adaptado para comunicarse con el backend NestJS disponible en `/api`.
- Tokens almacenados en el `AccessStore`, con refresco automático y validación de expiraciones.
- Perfil del usuario obtenido desde `/api/auth/profile` y transformado mediante `mapBackendUserToUserInfo`.
- En `docs/auth_context.md` se detalla el flujo completo y las variables de entorno involucradas.

## Variables de entorno clave

- `.env.development`: apunta a `http://localhost:3000/api`, desactiva mocks y el bypass de login.
- `.env.production`: usa `/api` asumiendo proxy inverso en la misma URL del frontend.
- Otros ajustes globales (título, modo de router, compresión) siguen la configuración del template Vben.

## Próximos pasos sugeridos

- Implementar los CRUDs de usuarios (`/api/users`) reutilizando los stores y utilerías existentes.
- Revisar la generación de códigos/permisos (`deriveAccessCodes`) cuando el backend exponga permisos más específicos.
- Añadir tests end-to-end una vez que el flujo de autenticación esté desplegado en un entorno estable.

Mantén este resumen actualizado cuando se incorporen nuevos módulos, paquetes compartidos o cambios significativos en la arquitectura.
