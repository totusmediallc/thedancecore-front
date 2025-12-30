# Contexto de Sistema de Permisos para Frontend

> **Propósito**: Este documento contiene toda la información necesaria para que el frontend (React) implemente el sistema de autenticación, manejo de permisos y panel de administración de usuarios.

## Resumen de Cambios en Backend

Se ha implementado un sistema de permisos granular con:
- 4 niveles de roles: `admin`, `academy`, `teacher`, `dancer`
- Permisos por defecto según rol
- Overrides de permisos por usuario
- Vinculación de usuarios a academias

---

## 1. Autenticación (Login)

### Endpoint
```
POST /api/auth/login
```

### Request
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

### Response Actualizada
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "academy",
    "academyId": "uuid-de-la-academia",
    "academy": {
      "id": "uuid",
      "name": "Academia de Baile XYZ"
    },
    "isActive": true,
    "lastLoginAt": "2024-12-20T10:30:00Z",
    "permissions": [
      "academies.read",
      "academies.update",
      "dancers.create",
      "dancers.read",
      "dancers.update",
      "dancers.delete",
      "choreographies.create",
      "choreographies.read",
      "choreographies.update",
      "choreographies.delete",
      "events.read",
      "orders.create",
      "orders.read",
      "orders.update",
      "locations.read",
      "dashboard.view"
    ]
  },
  "permissions": ["...mismos permisos..."],
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

### Datos Importantes para el Frontend
- **`user.role`**: Determina el nivel de acceso general
- **`user.permissions`**: Array de códigos de permisos efectivos
- **`user.academyId`**: ID de la academia asociada (null para admin)
- **`user.academy`**: Objeto con datos de la academia (útil para mostrar en UI)

---

## 2. Refresh Token

### Endpoint
```
POST /api/auth/refresh
```

### Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response
Misma estructura que el login, incluyendo los permisos actualizados.

---

## 3. Roles y Jerarquía

| Rol | Valor enum | Descripción |
|-----|------------|-------------|
| Administrador | `admin` | Acceso total, puede gestionar usuarios y permisos |
| Academia | `academy` | Usuario de academia, gestiona su academia y recursos |
| Profesor | `teacher` | Gestiona bailarines y coreografías de su academia |
| Bailarín | `dancer` | Solo lectura de sus datos y coreografías |

### Jerarquía de Acceso
```
admin > academy > teacher > dancer
```

---

## 4. Catálogo de Permisos

### Estructura de Permisos
Los permisos siguen el formato: `{módulo}.{acción}`

| Módulo | Permisos Disponibles |
|--------|---------------------|
| users | `users.create`, `users.read`, `users.update`, `users.delete`, `users.manage_permissions` |
| academies | `academies.create`, `academies.read`, `academies.update`, `academies.delete` |
| events | `events.create`, `events.read`, `events.update`, `events.delete` |
| coaches | `coaches.create`, `coaches.read`, `coaches.update`, `coaches.delete` |
| dancers | `dancers.create`, `dancers.read`, `dancers.update`, `dancers.delete` |
| choreographies | `choreographies.create`, `choreographies.read`, `choreographies.update`, `choreographies.delete` |
| orders | `orders.create`, `orders.read`, `orders.update`, `orders.delete` |
| catalogs | `catalogs.manage` |
| locations | `locations.read` |
| dashboard | `dashboard.view` |
| reports | `reports.view` |

### Permisos por Rol (Defecto)

#### Admin
Todos los permisos del sistema.

#### Academy
```javascript
[
  'academies.read', 'academies.update',
  'events.read',
  'coaches.create', 'coaches.read', 'coaches.update', 'coaches.delete',
  'dancers.create', 'dancers.read', 'dancers.update', 'dancers.delete',
  'choreographies.create', 'choreographies.read', 'choreographies.update', 'choreographies.delete',
  'orders.create', 'orders.read', 'orders.update',
  'locations.read',
  'dashboard.view'
]
```

#### Teacher
```javascript
[
  'academies.read',
  'events.read',
  'coaches.read',
  'dancers.create', 'dancers.read', 'dancers.update',
  'choreographies.create', 'choreographies.read', 'choreographies.update',
  'orders.read',
  'locations.read',
  'dashboard.view'
]
```

#### Dancer
```javascript
[
  'academies.read',
  'events.read',
  'dancers.read',
  'choreographies.read',
  'orders.read',
  'locations.read',
  'dashboard.view'
]
```

---

## 5. Verificación de Permisos en Frontend

### Hook Sugerido
```typescript
// usePermissions.ts
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin siempre tiene acceso
    return user.permissions?.includes(permission) ?? false;
  };
  
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };
  
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };
  
  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
```

### Componente de Protección
```tsx
// PermissionGate.tsx
interface Props {
  permission: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ 
  permission, 
  requireAll = false, 
  fallback = null, 
  children 
}: Props) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  
  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll 
    ? hasAllPermissions(permissions) 
    : hasAnyPermission(permissions);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
```

### Uso en Rutas
```tsx
// Rutas protegidas por permiso
<Route 
  path="/users" 
  element={
    <PermissionGate permission="users.read" fallback={<Unauthorized />}>
      <UsersPage />
    </PermissionGate>
  }
/>
```

### Uso en Componentes
```tsx
// Mostrar/ocultar botones según permiso
<PermissionGate permission="dancers.create">
  <Button onClick={handleCreate}>Nuevo Bailarín</Button>
</PermissionGate>

// Múltiples permisos
<PermissionGate permission={['users.update', 'users.delete']} requireAll={false}>
  <ActionButtons />
</PermissionGate>
```

---

## 6. Endpoints de Administración de Usuarios

### Listar Usuarios
```
GET /api/users?page=1&limit=20&search=&role=academy&isActive=true
```

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "academy",
      "academyId": "uuid",
      "academy": { "id": "uuid", "name": "Academia X" },
      "isActive": true,
      "lastLoginAt": "2024-12-20T10:30:00Z",
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Crear Usuario
```
POST /api/users
```

**Request**:
```json
{
  "email": "nuevo@academia.com",
  "password": "contraseña123",
  "firstName": "María",
  "lastName": "García",
  "role": "teacher",
  "academyId": "uuid-de-academia",
  "isActive": true
}
```

**Validaciones**:
- `email`: requerido, único, formato email válido
- `password`: requerido, mínimo 8 caracteres
- `firstName`: requerido
- `lastName`: opcional
- `role`: enum (`admin`, `academy`, `teacher`, `dancer`)
- `academyId`: **requerido si role es academy/teacher/dancer**
- `isActive`: opcional, default true

### Actualizar Usuario
```
PATCH /api/users/:id
```

**Request** (todos los campos opcionales):
```json
{
  "firstName": "María Actualizada",
  "lastName": "García López",
  "role": "academy",
  "academyId": "nuevo-uuid-academia",
  "isActive": false,
  "password": "nuevaContraseña123"
}
```

### Desactivar Usuario
```
DELETE /api/users/:id
```
Realiza soft delete (isActive = false).

### Obtener Detalle de Usuario
```
GET /api/users/:id
```

**Response** (incluye permisos efectivos):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "academy",
  "academyId": "uuid",
  "academy": { "id": "uuid", "name": "Academia X" },
  "isActive": true,
  "permissions": ["academies.read", "dancers.create", ...]
}
```

---

## 7. Endpoints de Gestión de Permisos

### Listar Todos los Permisos del Sistema
```
GET /api/permissions
GET /api/permissions?module=users
GET /api/permissions?search=create
```

**Response**:
```json
[
  {
    "id": "uuid",
    "code": "users.create",
    "name": "Crear usuarios",
    "description": "Permite crear nuevos usuarios en el sistema",
    "module": "users"
  },
  ...
]
```

### Listar Módulos Disponibles
```
GET /api/permissions/modules
```

**Response**:
```json
["academies", "catalogs", "choreographies", "coaches", "dancers", "dashboard", "events", "locations", "orders", "reports", "users"]
```

### Obtener Permisos de un Rol
```
GET /api/permissions/roles/:role
```

**Ejemplo**: `GET /api/permissions/roles/academy`

**Response**:
```json
[
  {
    "id": "uuid",
    "code": "academies.read",
    "name": "Ver academias",
    "description": "Permite ver listado y detalle de academias",
    "module": "academies"
  },
  ...
]
```

### Obtener Detalle de Permisos de Usuario
```
GET /api/users/:userId/permissions-detail
```

**Response**:
```json
{
  "role": "academy",
  "rolePermissions": [
    { "id": "uuid", "code": "academies.read", "name": "Ver academias", ... }
  ],
  "overrides": [
    { "permission": { "code": "events.create", ... }, "granted": true },
    { "permission": { "code": "academies.update", ... }, "granted": false }
  ],
  "effectivePermissions": ["academies.read", "events.create", "dancers.read", ...]
}
```

### Asignar Permiso a Usuario
```
POST /api/users/:userId/permissions
```

**Request**:
```json
{
  "permissionId": "uuid-del-permiso",
  "granted": true
}
```

- `granted: true` → Otorga el permiso adicional
- `granted: false` → Revoca el permiso (aunque lo tenga por rol)

### Asignar Permiso por Código
```
POST /api/users/:userId/permissions/by-code
```

**Request**:
```json
{
  "permissionCode": "events.create",
  "granted": true
}
```

### Asignar Múltiples Permisos
```
POST /api/users/:userId/permissions/bulk
```

**Request**:
```json
{
  "permissionIds": ["uuid-1", "uuid-2", "uuid-3"],
  "granted": true
}
```

### Sincronizar Permisos (Establecer Lista Exacta)
```
POST /api/users/:userId/permissions/sync
```

**Request**:
```json
{
  "role": "academy",
  "permissionCodes": [
    "academies.read",
    "dancers.read",
    "events.read",
    "events.create"
  ]
}
```

Esto establecerá exactamente esos permisos para el usuario, creando overrides según sea necesario.

### Eliminar Override de Permiso
```
DELETE /api/users/:userId/permissions/:permissionId
```

El usuario volverá a tener los permisos por defecto de su rol para ese permiso.

### Eliminar Todos los Overrides
```
DELETE /api/users/:userId/permissions
```

El usuario tendrá exactamente los permisos de su rol, sin modificaciones.

---

## 8. Implementación del Panel de Usuarios

### Estructura Sugerida del Panel

```
/admin/users                    - Lista de usuarios
/admin/users/new                - Crear usuario
/admin/users/:id                - Detalle/editar usuario
/admin/users/:id/permissions    - Gestionar permisos del usuario
```

### Vista de Lista de Usuarios
- Tabla con columnas: Nombre, Email, Rol, Academia, Estado, Último acceso, Acciones
- Filtros: Búsqueda por nombre/email, filtro por rol, filtro por estado activo
- Paginación
- Botón "Nuevo Usuario" (si tiene permiso `users.create`)

### Vista de Detalle/Edición de Usuario
- Formulario con campos editables
- Select de rol con opciones: admin, academy, teacher, dancer
- Select de academia (mostrar si rol no es admin)
- Toggle de estado activo
- Cambio de contraseña opcional
- Botón para ir a gestión de permisos

### Vista de Gestión de Permisos
Diseño sugerido:
1. **Sección izquierda**: Permisos del rol (solo lectura, referencia)
2. **Sección derecha**: Modificaciones (overrides)
   - Lista de permisos adicionales otorgados
   - Lista de permisos revocados
   - Buscador de permisos para agregar
3. **Sección inferior**: Lista de permisos efectivos resultantes

---

## 9. Consideraciones de UX

### Navegación según Rol
```typescript
const menuItems = [
  { 
    label: 'Dashboard', 
    path: '/dashboard', 
    permission: 'dashboard.view' 
  },
  { 
    label: 'Usuarios', 
    path: '/admin/users', 
    permission: 'users.read',
    roles: ['admin'] // Solo admins ven este menú
  },
  { 
    label: 'Academias', 
    path: '/academies', 
    permission: 'academies.read' 
  },
  { 
    label: 'Eventos', 
    path: '/events', 
    permission: 'events.read' 
  },
  { 
    label: 'Bailarines', 
    path: '/dancers', 
    permission: 'dancers.read' 
  },
  { 
    label: 'Coreografías', 
    path: '/choreographies', 
    permission: 'choreographies.read' 
  },
  { 
    label: 'Pedidos', 
    path: '/orders', 
    permission: 'orders.read' 
  },
  { 
    label: 'Catálogos', 
    path: '/catalogs', 
    permission: 'catalogs.manage',
    roles: ['admin']
  },
];

// Filtrar menú según permisos
const visibleMenu = menuItems.filter(item => {
  if (item.roles && !item.roles.includes(user.role)) return false;
  return hasPermission(item.permission);
});
```

### Mensajes de Error
- **401 Unauthorized**: "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
- **403 Forbidden**: "No cuentas con los permisos necesarios para realizar esta acción."
- **400 Bad Request (academia requerida)**: "Este rol requiere una academia asociada."

### Estado Inicial al Login
1. Guardar `accessToken` y `refreshToken` en localStorage/sessionStorage
2. Guardar `user` con `permissions` en estado global (Context/Redux/Zustand)
3. Redirigir al dashboard si tiene permiso, o a la primera ruta permitida

---

## 10. Tipos TypeScript Sugeridos

```typescript
// types/auth.ts
export type UserRole = 'admin' | 'academy' | 'teacher' | 'dancer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  academyId?: string;
  academy?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
}

export interface LoginResponse {
  user: User;
  permissions: string[];
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
}

export interface UserPermissionsDetail {
  role: UserRole;
  rolePermissions: Permission[];
  overrides: {
    permission: Permission;
    granted: boolean;
  }[];
  effectivePermissions: string[];
}
```

---

## 11. Flujo de Trabajo Completo

### Login
```
1. Usuario ingresa credenciales
2. POST /api/auth/login
3. Recibir user + permissions + tokens
4. Almacenar tokens
5. Guardar user con permissions en estado global
6. Redirigir a dashboard o primera ruta permitida
```

### Verificación de Acceso en Cada Página
```
1. Verificar si hay token válido
2. Si no hay token → redirigir a login
3. Si hay token pero no tiene permiso → mostrar "Sin acceso"
4. Si tiene permiso → mostrar contenido
```

### Refresh Token
```
1. Interceptor detecta 401 en respuesta
2. Intentar refresh con POST /api/auth/refresh
3. Si éxito → actualizar tokens y reintentar request original
4. Si falla → logout y redirigir a login
```

### Administración de Permisos (Solo Admin)
```
1. Ir a /admin/users/:id/permissions
2. GET /api/permissions (lista todos los permisos)
3. GET /api/users/:id/permissions-detail (permisos actuales)
4. Modificar con POST /api/users/:id/permissions
5. Usuario afectado verá los cambios en su próximo login/refresh
```

---

## 12. Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| 400 "El rol X requiere una academia asociada" | Crear usuario sin academyId | Siempre enviar academyId para roles no-admin |
| 403 "No cuentas con los permisos necesarios" | Usuario sin permiso | Verificar permisos antes de mostrar acción |
| 401 "Token inválido" | Token expirado/corrupto | Hacer refresh o logout |
| 404 "Usuario no encontrado" | ID incorrecto | Validar existencia antes de editar |

---

Este documento debe mantenerse actualizado conforme se agreguen nuevos permisos o funcionalidades al backend.
