# Relación Academias - Usuarios

> **Última actualización**: Diciembre 2024

## Propósito

Este documento describe la relación entre academias y usuarios del sistema, incluyendo la gestión de usuarios asociados a academias, roles permitidos, y los endpoints disponibles para su administración.

## Modelo de Datos

### Relación

```
┌─────────────────┐       1:N        ┌─────────────────┐
│    academies    │ ◄──────────────► │  system_users   │
│                 │                   │                 │
│  id (PK)        │                   │  id (PK)        │
│  name           │                   │  email          │
│  mail           │                   │  academy_id (FK)│
│  ...            │                   │  role           │
└─────────────────┘                   │  ...            │
                                      └─────────────────┘
```

- **Una academia puede tener múltiples usuarios** (1:N)
- **Un usuario pertenece a una sola academia** (o ninguna si es admin global)
- La relación se establece mediante `academy_id` en `system_users`

### Columna academy_id en system_users

```sql
academy_id UUID REFERENCES academies(id) ON DELETE SET NULL
```

- `NULL` para administradores globales
- `UUID` de la academia para usuarios de academia, profesores y bailarines

## Roles y Requisitos de Academia

| Rol | academy_id | Descripción |
|-----|------------|-------------|
| `admin` | Opcional (NULL) | Administrador global, puede no tener academia |
| `academy` | **Requerido** | Usuario administrador de una academia |
| `teacher` | **Requerido** | Profesor/Coach, debe pertenecer a una academia |
| `dancer` | **Requerido** | Bailarín, debe pertenecer a una academia |

## Endpoints de Gestión

### CRUD de Academias (existentes)

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| POST | `/api/academies` | Crear academia (sin usuario) | admin |
| GET | `/api/academies` | Listar academias | admin, client |
| GET | `/api/academies/:id` | Detalle de academia | admin, client |
| PATCH | `/api/academies/:id` | Actualizar academia | admin |
| DELETE | `/api/academies/:id` | Eliminar academia | admin |

### Crear Academia con Usuario

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| POST | `/api/academies/with-user` | Crear academia con usuario admin | admin |
| GET | `/api/academies/:id/with-users` | Academia con sus usuarios | admin |

### Gestión de Usuarios de Academia

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/academies/:academyId/users` | Listar usuarios de academia | admin |
| GET | `/api/academies/:academyId/users/stats` | Estadísticas de usuarios | admin |
| POST | `/api/academies/:academyId/users` | Crear usuario en academia | admin |
| GET | `/api/academies/:academyId/users/:userId` | Detalle de usuario | admin |
| PATCH | `/api/academies/:academyId/users/:userId` | Actualizar usuario | admin |
| PATCH | `/api/academies/:academyId/users/:userId/activate` | Activar usuario | admin |
| PATCH | `/api/academies/:academyId/users/:userId/deactivate` | Desactivar usuario | admin |
| POST | `/api/academies/:academyId/users/:userId/reset-password` | Resetear contraseña | admin |
| DELETE | `/api/academies/:academyId/users/:userId` | Eliminar usuario | admin |
| POST | `/api/academies/:academyId/users/:userId/transfer` | Transferir a otra academia | admin |

## Ejemplos de Uso

### Crear Academia con Usuario Administrador

```http
POST /api/academies/with-user
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Academia de Danza Estrella",
  "contactPhoneNumber": "+52 55 1234 5678",
  "mail": "contacto@estrella-danza.com",
  "web": "https://estrella-danza.com",
  "colonyId": 12345,
  "googlemaps": "https://maps.google.com/...",
  "logo": "https://cdn.example.com/logo.png",
  "adminUser": {
    "email": "admin@estrella-danza.com",
    "password": "SecurePass123!",
    "firstName": "María",
    "lastName": "García"
  }
}
```

**Respuesta:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Academia de Danza Estrella",
  "contactPhoneNumber": "+52 55 1234 5678",
  "mail": "contacto@estrella-danza.com",
  "web": "https://estrella-danza.com",
  "colonyId": 12345,
  "googlemaps": "https://maps.google.com/...",
  "logo": "https://cdn.example.com/logo.png",
  "users": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "admin@estrella-danza.com",
      "firstName": "María",
      "lastName": "García",
      "role": "academy",
      "isActive": true,
      "academyId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "createdAt": "2024-12-21T10:00:00.000Z",
  "updatedAt": "2024-12-21T10:00:00.000Z"
}
```

### Listar Usuarios de una Academia

```http
GET /api/academies/{academyId}/users?page=1&limit=10&role=teacher&isActive=true&search=juan
Authorization: Bearer {token}
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| page | number | Página (default: 1) |
| limit | number | Registros por página (default: 20, max: 100) |
| search | string | Búsqueda por email, nombre o apellido |
| role | enum | Filtrar por rol: academy, teacher, dancer |
| isActive | boolean | Filtrar por estado activo |

**Respuesta:**
```json
{
  "data": [
    {
      "id": "user-uuid",
      "email": "juan.profesor@academia.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "teacher",
      "isActive": true,
      "academyId": "academy-uuid",
      "createdAt": "2024-12-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### Crear Usuario en Academia

```http
POST /api/academies/{academyId}/users
Content-Type: application/json
Authorization: Bearer {token}

{
  "email": "profesor@academia.com",
  "password": "MinPassword8",
  "firstName": "Carlos",
  "lastName": "López",
  "role": "teacher",
  "isActive": true
}
```

**Roles permitidos para usuarios de academia:**
- `academy` - Administrador de la academia
- `teacher` - Profesor/Coach
- `dancer` - Bailarín

**Nota:** No se permite crear usuarios con rol `admin` desde estos endpoints.

### Actualizar Usuario de Academia

```http
PATCH /api/academies/{academyId}/users/{userId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "firstName": "Carlos Alberto",
  "role": "academy",
  "isActive": true
}
```

### Activar/Desactivar Usuario

```http
# Activar
PATCH /api/academies/{academyId}/users/{userId}/activate
Authorization: Bearer {token}

# Desactivar (soft delete)
PATCH /api/academies/{academyId}/users/{userId}/deactivate
Authorization: Bearer {token}
```

### Restablecer Contraseña

```http
POST /api/academies/{academyId}/users/{userId}/reset-password
Content-Type: application/json
Authorization: Bearer {token}

{
  "password": "NuevaContraseña123!"
}
```

**Efectos:**
- Actualiza la contraseña del usuario
- Invalida el refresh token (fuerza re-login)

### Transferir Usuario a Otra Academia

```http
POST /api/academies/{academyId}/users/{userId}/transfer
Content-Type: application/json
Authorization: Bearer {token}

{
  "newAcademyId": "nueva-academia-uuid"
}
```

### Estadísticas de Usuarios de Academia

```http
GET /api/academies/{academyId}/users/stats
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "total": 25,
  "active": 22,
  "inactive": 3,
  "byRole": {
    "academy": {
      "total": 2,
      "active": 2,
      "inactive": 0
    },
    "teacher": {
      "total": 8,
      "active": 7,
      "inactive": 1
    },
    "dancer": {
      "total": 15,
      "active": 13,
      "inactive": 2
    }
  }
}
```

### Eliminar Usuario (Permanente)

```http
DELETE /api/academies/{academyId}/users/{userId}
Authorization: Bearer {token}
```

**Nota:** Se recomienda usar desactivación en lugar de eliminación permanente.

## Filtrar Usuarios por Academia (Endpoint Global)

También es posible filtrar usuarios por academia desde el endpoint principal:

```http
GET /api/users?academyId={academyId}&role=teacher&isActive=true
Authorization: Bearer {token}
```

## Consideraciones de Seguridad

### Restricciones de Roles

1. **Solo admin puede gestionar usuarios de academia**
   - Todos los endpoints de `/api/academies/:id/users/*` requieren rol `admin`

2. **No se pueden crear admins desde endpoints de academia**
   - Los roles permitidos son: `academy`, `teacher`, `dancer`

3. **Usuarios no-admin no pueden cambiar su academia**
   - La modificación de `academyId` está bloqueada para roles no-admin

### Eliminación de Academia

- **No se puede eliminar una academia que tiene usuarios**
- Primero se deben eliminar o transferir todos los usuarios

### Desactivación vs Eliminación

| Acción | Efecto | Reversible |
|--------|--------|------------|
| Desactivar | `isActive=false`, limpia refresh token | ✅ Sí |
| Eliminar | Borrado permanente | ❌ No |

## Flujo Recomendado para Frontend

### 1. Crear Nueva Academia

```
1. Mostrar formulario con datos de academia
2. Incluir sección para usuario administrador
3. POST /api/academies/with-user
4. Mostrar credenciales al usuario (email/contraseña temporal)
5. Recomendar cambio de contraseña en primer login
```

### 2. Gestión de Usuarios de Academia

```
1. GET /api/academies/{id}/users - Cargar lista
2. Mostrar tabla con filtros (rol, estado, búsqueda)
3. Acciones por usuario:
   - Ver detalle → GET /api/academies/{id}/users/{userId}
   - Editar → PATCH /api/academies/{id}/users/{userId}
   - Activar/Desactivar → PATCH .../activate o .../deactivate
   - Resetear contraseña → POST .../reset-password
   - Eliminar → DELETE (con confirmación)
```

### 3. Dashboard de Academia

```
1. GET /api/academies/{id}/users/stats
2. Mostrar resumen: total, activos, inactivos
3. Gráfico por roles
```

## Integración con Sistema de Permisos

Los usuarios de academia heredan los permisos base de su rol:

- **academy**: Gestión completa de su academia
- **teacher**: Gestión de bailarines y coreografías
- **dancer**: Solo lectura de sus datos

Los administradores pueden personalizar permisos individuales usando:
- `POST /api/users/:userId/permissions`
- `POST /api/users/:userId/permissions/sync`

Ver `docs/frontend_permissions_context.md` para más detalles.

## Mantenimiento

- Si se agregan nuevos campos al usuario, actualizar DTOs correspondientes
- Si se modifican roles, actualizar validaciones en el service
- Actualizar este documento y `postman-import.json` con cada cambio
