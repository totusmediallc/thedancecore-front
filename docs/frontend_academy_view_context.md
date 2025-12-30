# Contexto para Frontend: Vista de Academias - Registro a Eventos

## Descripción General

Este documento proporciona el contexto completo para desarrollar la vista de academias en el frontend de TheDanceCore. Esta vista permite a las academias:

1. Ver eventos disponibles y su estado de invitación
2. Aceptar/rechazar invitaciones a eventos
3. Registrar coreografías con bailarines asignados
4. Asignar coaches representantes al evento
5. Realizar pedidos de playeras para sus bailarines
6. Ver el estado y resumen de su registro

---

## Arquitectura del Sistema

### Stack Backend
- **Framework**: NestJS con TypeORM
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT con refresh tokens
- **Autorización**: Roles + Permisos granulares

### Roles del Sistema
| Rol | Descripción | Acceso a esta vista |
|-----|-------------|---------------------|
| `admin` | Administrador total | Puede ver todo, gestionar cualquier academia |
| `academy` | Usuario de academia | Ve solo su academia y sus datos |
| `teacher` | Profesor/Coach | Acceso limitado según permisos |
| `dancer` | Bailarín | Sin acceso a esta vista |

### Autenticación
```typescript
// Headers requeridos en todas las peticiones
Authorization: Bearer <access_token>

// Refresh token endpoint
POST /api/auth/refresh
Body: { refreshToken: string }
```

---

## Flujo de Registro de Academia a Evento

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE REGISTRO A EVENTO                       │
└─────────────────────────────────────────────────────────────────────┘

1. INVITACIÓN
   Admin asigna academias a evento → Estado: "invited"
   
2. ACEPTACIÓN  
   Academia acepta invitación → Estado: "accepted"
   (O rechaza → Estado: "rejected")
   
3. REGISTRO DE DATOS
   Academia registra:
   ├── Coreografías (con bailarines)
   ├── Coaches representantes
   └── Pedido de playeras
   
4. COMPLETAR REGISTRO
   Academia finaliza → Estado: "registered"
   
5. VALIDACIÓN (Admin)
   Admin valida → Estado: "completed"
```

---

## Estados del Sistema

### Estados de Eventos (`EventStatus`)
| Estado | Descripción | Acciones permitidas |
|--------|-------------|---------------------|
| `draft` | Borrador, no visible | Solo admin puede editar |
| `open` | Abierto para registro | Academias pueden registrarse |
| `closed` | Registro cerrado | Solo lectura para academias |
| `finished` | Evento finalizado | Solo lectura |

### Estados de Participación (`AcademyRegistrationStatus`)
| Estado | Descripción | Transiciones válidas |
|--------|-------------|----------------------|
| `invited` | Academia invitada | → accepted, rejected |
| `accepted` | Academia aceptó | → registered |
| `rejected` | Academia rechazó | (final) |
| `registered` | Registro completado | → completed |
| `completed` | Validado por admin | (final) |

---

## Endpoints por Módulo

### 1. Eventos (Events)
Base URL: `/api/events`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Lista eventos (filtrar por status para academias) |
| `GET` | `/:id` | Detalle de evento |

#### Modelo de Evento
```typescript
interface Event {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  bannerUrl?: string;
  status: 'draft' | 'open' | 'closed' | 'finished';
  registrationStartDate: Date;    // Inicio de período de registro
  registrationEndDate: Date;      // Fin de período de registro
  updateDeadlineDate: Date;       // Fecha límite para modificaciones
  locationId?: string;
  location?: Location;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. Relación Evento-Academia (Event Academies)
Base URL: `/api/event-academies`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/academy/:academyId` | Eventos de la academia |
| `GET` | `/:academyId/:eventId` | Detalle de participación |
| `PATCH` | `/:academyId/:eventId/status` | Actualizar estado |

#### Modelo EventAcademy
```typescript
interface EventAcademy {
  academyId: string;
  eventId: string;
  status: 'invited' | 'accepted' | 'rejected' | 'registered' | 'completed';
  acceptedAt?: Date;
  registeredAt?: Date;
  notes?: string;
  academy: Academy;
  event: Event;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Actualizar Estado
```typescript
// PATCH /api/event-academies/:academyId/:eventId/status
{
  status: 'accepted' | 'rejected' | 'registered'
}
```

---

### 3. Coreografías (Choreographies)
Base URL: `/api/choreographies`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/` | Crear coreografía |
| `GET` | `/event/:eventId/academy/:academyId` | Coreografías de academia en evento |
| `GET` | `/:id` | Detalle de coreografía |
| `PATCH` | `/:id` | Actualizar coreografía |
| `DELETE` | `/:id` | Eliminar coreografía |

#### Crear Coreografía
```typescript
// POST /api/choreographies
{
  name: string;           // Nombre de la coreografía
  academyId: string;      // UUID de la academia
  eventId: string;        // UUID del evento
  musicGenreId: string;   // UUID del género musical
  categoryId: string;     // UUID de la categoría
  subcategoryId?: string; // UUID de subcategoría (opcional)
}
```

#### Modelo Choreography
```typescript
interface Choreography {
  id: string;
  name: string;
  academyId: string;
  eventId: string;
  musicGenreId: string;
  categoryId: string;
  subcategoryId?: string;
  academy: Academy;
  event: Event;
  musicGenre: MusicGenre;
  category: Category;
  subcategory?: Subcategory;
  dancers: ChoreographyDancer[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 4. Asignación de Bailarines a Coreografías (Choreography Dancers)
Base URL: `/api/choreography-dancers`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/` | Asignar bailarín a coreografía |
| `POST` | `/bulk` | Asignar múltiples bailarines |
| `GET` | `/choreography/:choreographyId` | Bailarines de una coreografía |
| `DELETE` | `/:dancerId/:choreographyId` | Desasignar bailarín |

#### Asignar Bailarín
```typescript
// POST /api/choreography-dancers
{
  dancerId: string;
  choreographyId: string;
}

// POST /api/choreography-dancers/bulk
{
  choreographyId: string;
  dancerIds: string[];
}
```

---

### 5. Bailarines (Dancers)
Base URL: `/api/dancers`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/create-or-link` | **Crear o vincular bailarín existente** |
| `GET` | `/academy/:academyId` | Bailarines de la academia |
| `GET` | `/curp/:curp` | Buscar por CURP |
| `GET` | `/:id` | Detalle de bailarín |
| `PATCH` | `/:id` | Actualizar bailarín |
| `POST` | `/:id/link/:academyId` | Vincular a otra academia |
| `DELETE` | `/:id/unlink/:academyId` | Desvincular de academia |

#### Crear o Vincular Bailarín (IMPORTANTE)
```typescript
// POST /api/dancers/create-or-link
{
  name: string;
  email?: string;
  phone?: string;
  birthDate: Date;      // Formato: YYYY-MM-DD
  curp: string;         // CURP único del bailarín
  academyId: string;    // Academia que lo está registrando
}

// Respuesta
{
  dancer: Dancer;
  wasLinked: boolean;   // true = ya existía y se vinculó
  message: string;      // "Bailarín vinculado exitosamente" o "Bailarín creado exitosamente"
}
```

**Lógica del endpoint**:
1. Si el CURP ya existe → vincula al bailarín existente con la academia
2. Si el CURP no existe → crea bailarín nuevo

#### Modelo Dancer
```typescript
interface Dancer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate: Date;
  curp: string;         // Único en todo el sistema
  academies: Academy[]; // Puede pertenecer a múltiples academias
  choreographies: ChoreographyDancer[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 6. Coaches de Academia en Evento (Event Academy Coaches)
Base URL: `/api/event-academy-coaches`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/` | Asignar coach |
| `POST` | `/bulk` | Asignar múltiples coaches |
| `GET` | `/event/:eventId/academy/:academyId` | Coaches de academia en evento |
| `DELETE` | `/:coachId/:academyId/:eventId` | Desasignar coach |

#### Asignar Coach
```typescript
// POST /api/event-academy-coaches
{
  coachId: string;
  academyId: string;
  eventId: string;
}

// POST /api/event-academy-coaches/bulk
{
  academyId: string;
  eventId: string;
  coachIds: string[];
}
```

---

### 7. Pedidos de Playeras (Orders + Order Items)
Base URL: `/api/orders`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/find-or-create` | Obtener o crear pedido |
| `GET` | `/event/:eventId/academy/:academyId` | Pedido de academia en evento |
| `PATCH` | `/:id` | Actualizar pedido |

Base URL: `/api/order-items`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/` | Agregar ítem |
| `GET` | `/order/:orderId` | Ítems del pedido |
| `PATCH` | `/:id` | Actualizar ítem |
| `DELETE` | `/:id` | Eliminar ítem |

#### Obtener o Crear Pedido
```typescript
// POST /api/orders/find-or-create
{
  eventId: string;
  academyId: string;
}

// Respuesta
{
  order: Order;
  wasCreated: boolean;
}
```

#### Agregar Ítem al Pedido
```typescript
// POST /api/order-items
{
  orderId: string;
  tshirtTypeId: string;   // Tipo de playera
  sizeId: string;         // Talla
  quantity: number;
  notes?: string;
}
```

#### Modelo Order
```typescript
interface Order {
  id: string;
  eventId: string;
  academyId: string;
  createdById?: string;
  notes?: string;
  event: Event;
  academy: Academy;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  id: string;
  orderId: string;
  tshirtTypeId: string;
  sizeId: string;
  quantity: number;
  notes?: string;
  tshirtType: TshirtType;
  size: Size;
}
```

---

### 8. Resumen y Estadísticas (Academy Event Registration)
Base URL: `/api/academy-event-registration`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/event/:eventId/academy/:academyId/summary` | Resumen completo |
| `GET` | `/event/:eventId/academy/:academyId/stats` | Solo conteos |

#### Resumen Completo
```typescript
// GET /api/academy-event-registration/event/:eventId/academy/:academyId/summary
{
  event: {
    id: string;
    name: string;
    status: EventStatus;
    registrationStartDate: Date;
    registrationEndDate: Date;
    updateDeadlineDate: Date;
  };
  academy: {
    id: string;
    name: string;
  };
  registration: {
    status: AcademyRegistrationStatus;
    acceptedAt: Date | null;
    registeredAt: Date | null;
    notes: string | null;
  };
  stats: {
    totalChoreographies: number;
    totalDancers: number;
    totalCoaches: number;
    totalTshirtOrders: number;
    totalTshirtItems: number;
  };
  choreographies: Choreography[];
  coaches: Coach[];
  order: Order | null;
}
```

---

### 9. Catálogos (Solo lectura)

#### Categorías
```typescript
GET /api/categories
// Para el selector de categoría en coreografías
```

#### Subcategorías
```typescript
GET /api/subcategories
GET /api/subcategories/category/:categoryId
// Filtrar por categoría seleccionada
```

#### Géneros Musicales
```typescript
GET /api/music-genres
```

#### Coaches de la Academia
```typescript
GET /api/coaches/academy/:academyId
// Coaches disponibles para asignar
```

#### Tipos de Playera y Tallas
```typescript
GET /api/tshirt-types
GET /api/sizes
GET /api/size-scales
```

---

## Vistas Sugeridas

### 1. Dashboard Principal de Academia
**Ruta sugerida**: `/academy/dashboard`

**Componentes**:
- Lista de eventos con invitaciones pendientes
- Eventos aceptados con progreso de registro
- Contadores rápidos (coreografías, bailarines, coaches)

**Endpoints a usar**:
- `GET /api/event-academies/academy/:academyId`
- `GET /api/academy-event-registration/.../stats` (para cada evento)

---

### 2. Detalle de Registro a Evento
**Ruta sugerida**: `/academy/events/:eventId`

**Secciones**:
1. **Header**: Info del evento + estado de participación
2. **Tab Coreografías**: CRUD de coreografías con asignación de bailarines
3. **Tab Coaches**: Selección de coaches representantes
4. **Tab Playeras**: Pedido de playeras con selector de tallas
5. **Tab Resumen**: Vista previa y botón de finalizar registro

**Endpoints a usar**:
- `GET /api/academy-event-registration/.../summary`
- Endpoints específicos de cada módulo según la tab activa

---

### 3. Gestión de Bailarines
**Ruta sugerida**: `/academy/dancers`

**Funcionalidades**:
- Lista de bailarines de la academia
- Formulario para agregar (usando `create-or-link`)
- Notificación cuando un bailarín ya existía y fue vinculado

**Endpoints a usar**:
- `GET /api/dancers/academy/:academyId`
- `POST /api/dancers/create-or-link`
- `PATCH /api/dancers/:id`

---

## Validaciones del Frontend

### Fechas
- No permitir registro si `event.status !== 'open'`
- No permitir modificaciones después de `updateDeadlineDate`
- Mostrar advertencias cuando se acerque `registrationEndDate`

### CURP
- Formato: 18 caracteres alfanuméricos
- Validar formato antes de enviar
- Manejar respuesta de `create-or-link` para informar si fue vinculado

### Estados de Participación
- Solo mostrar acciones válidas según estado actual:
  - `invited`: Botones Aceptar/Rechazar
  - `accepted`: Formularios de registro habilitados
  - `registered`: Solo lectura + mensaje de espera
  - `completed`: Solo lectura + badge de completado

---

## Manejo de Errores

### Códigos HTTP Comunes
| Código | Significado | Acción Frontend |
|--------|-------------|-----------------|
| 400 | Bad Request | Mostrar mensaje de validación |
| 401 | No autenticado | Redirigir a login |
| 403 | Sin permisos | Mostrar mensaje de acceso denegado |
| 404 | No encontrado | Mostrar mensaje o redirigir |
| 409 | Conflicto (duplicado) | Mostrar mensaje específico |

### Estructura de Error
```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
}
```

---

## Consideraciones de UX

1. **Auto-guardado**: Considerar guardar progreso automáticamente
2. **Confirmaciones**: Pedir confirmación antes de:
   - Rechazar invitación
   - Finalizar registro
   - Eliminar coreografía con bailarines asignados
3. **Feedback visual**: Indicar claramente:
   - Estado de carga
   - Éxito/error de operaciones
   - Fechas límite cercanas
4. **Responsive**: Priorizar vista móvil para coaches en campo

---

## Notas de Implementación

### Obtener academyId del Usuario
```typescript
// El usuario logueado tiene asociada una academia
// Obtener del token JWT o del endpoint de perfil
GET /api/auth/profile
// Respuesta incluye academyId si el rol es 'academy'
```

### Refresh de Datos
- Refrescar datos después de cada mutación
- Usar polling o websockets para estados que cambian externamente

### Caché
- Catálogos (categorías, géneros, tallas) raramente cambian → cachear
- Datos de registro → siempre frescos

---

## Checklist de Desarrollo

- [ ] Autenticación y manejo de tokens
- [ ] Dashboard con lista de eventos
- [ ] Vista de detalle de evento
- [ ] CRUD de coreografías
- [ ] Asignación de bailarines a coreografías
- [ ] CRUD de bailarines con create-or-link
- [ ] Asignación de coaches
- [ ] Pedido de playeras
- [ ] Cambio de estados de participación
- [ ] Vista de resumen pre-envío
- [ ] Manejo de errores global
- [ ] Validaciones de fechas y estados
- [ ] Responsive design
