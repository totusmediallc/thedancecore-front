## THEDANCECORE - Panel administrativo (React + CoreUI)

Proyecto base para el panel administrativo de THEDANCECORE, construido con React 19, Vite y CoreUI (tema por defecto con light/dark mode). Queda listo para comenzar a personalizar vistas, navegación y lógica de negocio.

### Requisitos

- Node.js 18+ y npm

### Desarrollo local

```bash
npm install
npm run dev   # servidor en http://localhost:3000
```

Si prefieres, también puedes usar `npm start` (equivalente).

### Build de producción

```bash
npm run build     # genera artefactos en dist/
npm run preview   # previsualiza el build en local
```

El build resultante en `dist/` puede desplegarse en cualquier hosting estático (Vercel, Netlify, S3/CloudFront, Nginx, etc.).

### Estructura del proyecto (resumen)

- `src/layout` Layouts base (header, sidebar, footer)
- `src/views` Vistas/páginas (Dashboard, etc.)
- `src/components` Componentes reutilizables
- `src/scss` Estilos (incluye variables y soporte dark/light)
- `src/_nav.js` Configuración del menú lateral
- `src/routes.js` Definición de rutas de la app

### Configuración útil

- Modo claro/oscuro: CoreUI ya lo trae listo; podrás personalizar variables en `src/scss/`.
- Navegación: edita el menú en `src/_nav.js` y las rutas en `src/routes.js`.
- Branding: actualiza `index.html` (título, meta tags) y los assets en `public/` o `src/assets/`.

### Variables de entorno

Usa el archivo `.env` (opcional) para declarar variables con prefijo `VITE_`.
Ejemplo: copia `.env.example` a `.env` y ajusta valores.

### Linter y formato

- `npm run lint` para revisar el código con ESLint.

### Créditos y licencia

Este proyecto está basado en CoreUI Free React Admin Template (MIT).  
Copyright © 2025 creativeLabs Łukasz Holeczek.

Código bajo licencia MIT. Revisa `LICENSE` para más detalles.

### Gestión de academias y competidores

La vista `Academias` ahora incluye la gestión de competidores asociados (bailarines) sin salir de la pantalla:

- En el listado de academias, cada fila muestra un botón "Ver competidores".
- Al hacer clic se abre un modal con el CRUD completo de competidores pertenecientes a esa academia.
- Filtros disponibles: búsqueda por nombre, correo, teléfono o CURP; paginación y tamaño de página.
- Validaciones: CURP única dentro de la academia, formato de correo y fecha de nacimiento requerida.
- Roles:
	- Administrador: puede crear, editar y eliminar competidores.
	- Cliente/usuario no admin: solo consulta.

Esto se implementa en el archivo `src/views/gestion/Academias.js` reutilizando estilos y patrones de la gestión de academias.