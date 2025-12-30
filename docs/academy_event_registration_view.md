# Vista de Registro de Academia a Eventos - Documentación Técnica

## 📋 Descripción General

Este módulo implementa el flujo completo de registro de academias a eventos en TheDanceCore. Permite a las academias gestionar su participación en eventos, incluyendo:

- Ver eventos disponibles e invitaciones pendientes
- Aceptar/rechazar invitaciones
- Registrar coreografías con bailarines asignados
- Asignar coaches representantes
- Realizar pedidos de playeras
- Enviar el registro para validación

El módulo está diseñado para funcionar tanto para **usuarios de academia** como para **administradores**, con diferentes niveles de acceso y funcionalidades.

---

## 🏗️ Arquitectura del Módulo

### Estructura de Archivos

```
src/
├── views/
│   ├── academy/
│   │   ├── index.js                      # Exportaciones del módulo
│   │   ├── AcademyEvents.jsx             # Lista de eventos de la academia
│   │   ├── AcademyEventRegistration.jsx  # Vista principal de registro
│   │   └── components/
│   │       ├── index.js                  # Exportaciones de componentes
│   │       ├── EventHeader.jsx           # Header del evento con estado
│   │       ├── ChoreographiesSection.jsx # CRUD de coreografías
│   │       ├── DancersSection.jsx        # CRUD de bailarines
│   │       ├── CoachesSection.jsx        # Asignación de coaches
│   │       └── TshirtOrderSection.jsx    # Pedido de playeras
│   │
│   ├── events/
│   │   ├── Events.js                     # Gestión de eventos
│   │   └── EventAcademiesModal.jsx       # Modal de academias por evento (NUEVO)
│   │
│   └── gestion/
│       ├── Academias.js                  # Gestión de academias
│       └── AcademyEventsModal.jsx        # Modal de eventos por academia (NUEVO)
│
├── services/
│   ├── eventAcademiesApi.js             # API relación evento-academia
│   ├── choreographiesApi.js             # API de coreografías
│   ├── choreographyDancersApi.js        # API asignación bailarines
│   ├── eventAcademyCoachesApi.js        # API asignación coaches
│   ├── ordersApi.js                     # API de pedidos
│   ├── academyEventRegistrationApi.js   # API resumen de registro
│   └── catalogsApi.js                   # API de catálogos (playeras, tallas)
```

### Rutas del Módulo

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/academy` | `AcademyEvents` | Redirección a lista de eventos |
| `/academy/events` | `AcademyEvents` | Lista de eventos de la academia |
| `/academy/events/:eventId` | `AcademyEventRegistration` | Detalle de registro a evento |

---

## 🔐 Control de Acceso

### Roles y Permisos

| Rol | Acceso | Funcionalidades |
|-----|--------|-----------------|
| `admin` | Total | Puede seleccionar cualquier academia y ver sus registros. Modo solo lectura. |
| `academy` | Propia academia | CRUD completo de su registro mientras esté permitido |
| `teacher` | Propia academia | Acceso limitado según permisos asignados |
| `dancer` | Sin acceso | No puede acceder a estas vistas |

### Lógica de Solo Lectura

El registro pasa a modo **solo lectura** cuando:
- El estado de participación es `rejected`, `registered` o `completed`
- El evento no tiene estado `open`
- La fecha límite de modificación (`updateDeadlineDate`) ya pasó
- El usuario es administrador (siempre es solo lectura para admin)

---

## 📊 Estados del Sistema

### Estados de Participación (`AcademyRegistrationStatus`)

```
invited → accepted → registered → completed
    ↓
  rejected
```

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| `invited` | Academia invitada | Aceptar / Rechazar |
| `accepted` | Academia aceptó | Registrar datos, Enviar registro |
| `rejected` | Academia rechazó | Solo lectura |
| `registered` | Registro enviado | Solo lectura (pendiente validación) |
| `completed` | Validado por admin | Solo lectura |

### Estados del Evento (`EventStatus`)

| Estado | Registro Permitido |
|--------|-------------------|
| `draft` | ❌ No |
| `open` | ✅ Sí |
| `closed` | ❌ No |
| `finished` | ❌ No |

---

## 🧩 Componentes

### EventHeader

**Propósito**: Muestra la información del evento, estado de participación, estadísticas y acciones principales.

**Props**:
```typescript
{
  event: Event;              // Datos del evento
  registration: Registration; // Estado de participación
  stats: Stats;              // Estadísticas del registro
  onAcceptInvitation: () => void;
  onRejectInvitation: () => void;
  onCompleteRegistration: () => void;
  isSubmitting: boolean;
  isReadOnly: boolean;
}
```

**Funcionalidades**:
- Banner visual del evento
- Badges de estado del evento y participación
- Alertas de fechas importantes
- Acciones de aceptar/rechazar invitación
- Barra de progreso del registro
- Botón de finalizar registro

### ChoreographiesSection

**Propósito**: CRUD completo de coreografías con asignación de bailarines.

**Props**:
```typescript
{
  eventId: string;
  academyId: string;
  choreographies: Choreography[];
  dancers: Dancer[];
  onRefresh: () => void;
  isReadOnly: boolean;
}
```

**Funcionalidades**:
- Crear/editar/eliminar coreografías
- Selección de categoría, subcategoría y género musical
- Asignación múltiple de bailarines
- Vista expandible de bailarines por coreografía

### DancersSection

**Propósito**: CRUD de bailarines de la academia.

**Props**:
```typescript
{
  academyId: string;
  dancers: Dancer[];
  onRefresh: () => void;
  isReadOnly: boolean;
}
```

**Funcionalidades**:
- Crear bailarines con validación de CURP
- Sistema "create-or-link": Si el CURP existe, vincula en lugar de crear
- Editar datos de bailarines
- Calcular y mostrar edad automáticamente

### CoachesSection

**Propósito**: Asignar coaches de la academia como representantes del evento.

**Props**:
```typescript
{
  eventId: string;
  academyId: string;
  assignedCoaches: Coach[];
  onRefresh: () => void;
  isReadOnly: boolean;
}
```

**Funcionalidades**:
- Selección múltiple de coaches disponibles
- Asignación en bulk
- Eliminación individual de coaches

### TshirtOrderSection

**Propósito**: Gestión del pedido de playeras.

**Props**:
```typescript
{
  eventId: string;
  academyId: string;
  order: Order;
  onRefresh: () => void;
  isReadOnly: boolean;
}
```

**Funcionalidades**:
- Crear pedido automáticamente si no existe
- Agregar/editar/eliminar ítems
- Selección de tipo de playera y talla
- Resumen de total de playeras

---

## 🔌 Servicios API

### eventAcademiesApi.js

```javascript
// Consultas
getAcademyEvents(academyId, params)     // Eventos de una academia
getEventAcademies(eventId, params)      // Academias de un evento
getEventAcademyDetail(academyId, eventId)

// Estados
acceptEventInvitation(academyId, eventId)
rejectEventInvitation(academyId, eventId)
completeEventRegistration(academyId, eventId)

// Admin
assignAcademyToEvent(payload)
bulkAssignAcademiesToEvent(payload)
removeAcademyFromEvent(academyId, eventId)
```

### choreographiesApi.js

```javascript
createChoreography(payload)
getChoreography(choreographyId)
updateChoreography(choreographyId, payload)
deleteChoreography(choreographyId)
getEventAcademyChoreographies(eventId, academyId)
```

### choreographyDancersApi.js

```javascript
assignDancerToChoreography(payload)
bulkAssignDancersToChoreography(payload)
getChoreographyDancers(choreographyId)
removeDancerFromChoreography(dancerId, choreographyId)
```

### eventAcademyCoachesApi.js

```javascript
assignCoachToEventAcademy(payload)
bulkAssignCoachesToEventAcademy(payload)
getEventAcademyCoaches(eventId, academyId)
removeCoachFromEventAcademy(coachId, academyId, eventId)
```

### ordersApi.js

```javascript
findOrCreateOrder(payload)
getEventAcademyOrder(eventId, academyId)
updateOrder(orderId, payload)
addOrderItem(payload)
updateOrderItem(itemId, payload)
deleteOrderItem(itemId)
```

### academyEventRegistrationApi.js

```javascript
getRegistrationSummary(eventId, academyId)  // Resumen completo
getRegistrationStats(eventId, academyId)    // Solo conteos
```

---

## 🎨 Diseño de Interfaz

### Flujo de Usuario - Academia

1. **Lista de Eventos** (`/academy/events`)
   - Ver eventos agrupados por estado
   - Filtrar por estado
   - Alertas de fechas próximas a vencer

2. **Ver Invitación** (estado `invited`)
   - Información del evento
   - Botones Aceptar/Rechazar

3. **Registro Activo** (estado `accepted`)
   - Tabs: Coreografías, Bailarines, Coaches, Playeras
   - Barra de progreso
   - Botón "Finalizar y Enviar"

4. **Registro Enviado** (estado `registered`)
   - Vista de solo lectura
   - Mensaje de espera de validación

5. **Registro Completado** (estado `completed`)
   - Vista de solo lectura
   - Badge de confirmación

### Flujo de Usuario - Administrador

1. **Selector de Academia**
   - Dropdown para elegir academia
   - Ver registros de cualquier academia

2. **Vista de Solo Lectura**
   - Toda la información visible
   - Sin acciones de modificación

---

## 📝 Navegación (Menu)

### Para usuarios de Academia/Teacher

```
Mi Academia
├── Mis Eventos (badge: NUEVO)
```

### Para usuarios Admin

```
Administración
├── Eventos
├── Gestión
│   ├── Academias
│   ├── Géneros
│   └── Categorías
└── Registro de Academias (badge: VER)
```

---

## ⚠️ Validaciones

### CURP
- Formato: 18 caracteres alfanuméricos
- Regex: `/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i`
- Validación en tiempo real con feedback visual

### Fechas
- Alertas cuando `registrationEndDate` está próxima (3 días)
- Alertas cuando `updateDeadlineDate` está próxima
- Bloqueo de edición después de `updateDeadlineDate`

### Progreso de Registro
- Mínimo 70% para poder enviar
- Cálculo:
  - Coreografías: 40%
  - Bailarines: 30%
  - Coaches: 20%
  - Playeras: 10%

---

## 🔄 Historial de Cambios

### v1.0.0 - 30/12/2024
- **Inicial**: Creación del módulo completo
- Implementación de vista de lista de eventos
- Implementación de vista de registro a evento
- Creación de componentes modulares:
  - EventHeader
  - ChoreographiesSection
  - DancersSection
  - CoachesSection
  - TshirtOrderSection
- Creación de servicios API:
  - eventAcademiesApi
  - choreographiesApi
  - choreographyDancersApi
  - eventAcademyCoachesApi
  - ordersApi
  - academyEventRegistrationApi
  - catalogsApi
- Configuración de rutas y navegación
- Implementación de control de acceso por roles
- Soporte para administradores con selector de academia

---

## 🧪 Testing

### Escenarios a Probar

1. **Flujo de invitación**
   - [ ] Aceptar invitación
   - [ ] Rechazar invitación
   - [ ] Verificar transición de estados

2. **CRUD de Coreografías**
   - [ ] Crear coreografía
   - [ ] Editar coreografía
   - [ ] Eliminar coreografía
   - [ ] Asignar bailarines

3. **CRUD de Bailarines**
   - [ ] Crear bailarín nuevo
   - [ ] Vincular bailarín existente (CURP repetido)
   - [ ] Validación de CURP

4. **Asignación de Coaches**
   - [ ] Asignar múltiples coaches
   - [ ] Remover coach individual

5. **Pedido de Playeras**
   - [ ] Crear pedido
   - [ ] Agregar ítems
   - [ ] Editar/eliminar ítems

6. **Envío de Registro**
   - [ ] Verificar progreso mínimo
   - [ ] Enviar registro
   - [ ] Verificar modo solo lectura

7. **Vista Admin**
   - [ ] Selector de academias funcional
   - [ ] Vista solo lectura
   - [ ] Ver todos los registros

---

## 🐛 Problemas Conocidos

_Ninguno reportado actualmente_

---

## 📌 Próximas Mejoras

- [ ] Auto-guardado de cambios
- [ ] Notificaciones en tiempo real (WebSocket)
- [ ] Exportar registro a PDF
- [ ] Vista previa de credenciales
- [ ] Carga masiva de bailarines desde CSV
- [ ] Integración con sistema de pagos
- [ ] Dashboard de estadísticas para academia

---

## 🔄 Historial de Cambios

### v1.3.0 - 30/12/2024
- **CRUD de Eventos actualizado** (`Events.js`):
  - **Nuevo campo `status`**: Los eventos ahora tienen estado propio independiente de las fechas
    - `draft`: Borrador - no visible para academias
    - `open`: Abierto - las academias pueden registrarse
    - `closed`: Cerrado - no se aceptan nuevos registros
    - `finished`: Finalizado - evento terminado
  - **Nuevos campos de fechas de registro**:
    - `registrationStartDate`: Fecha desde la cual se acepta el registro
    - `registrationEndDate`: Fecha límite para nuevos registros
    - `updateDeadlineDate`: Fecha límite para modificaciones de academias
  - **Formulario mejorado**:
    - Sección "Estado del Evento y Registro" con selector de estado
    - Campos de fecha para controlar el período de registro
    - Descripciones explicativas en cada campo
  - **Tabla actualizada**:
    - Muestra el estado real del evento (no calculado por fechas)
    - Muestra fecha límite de registro si está definida
  - **Filtros actualizados**:
    - Opciones de filtro ahora coinciden con los estados reales del backend

### v1.2.1 - 30/12/2024
- **Corrección de permisos para admin**:
  - Admin ahora puede editar cuando el evento está en "borrador" (draft)
  - Útil para configurar registros antes de abrir el evento
  - Academias solo pueden editar cuando el evento está "abierto" (open)
- **Mensajes de advertencia mejorados**:
  - Alerta informativa cuando el evento está en borrador, cerrado o finalizado
  - Mensaje diferente para admin y academia
- **Mejoras en DancersSection**:
  - Confirmación de desvincular muestra el nombre del bailarín
  - Muestra mensaje de respuesta del backend tras desvincular
  - Respuesta del backend incluye: `wasUnlinked`, `remainingAcademies`, `message`

### v1.2.0 - 30/12/2024
- **Vista integral de registro a evento** - Panel completo para academias:
  - **DancersSection mejorado**:
    - Cambio de "Eliminar" a "Desvincular": El botón ya no elimina bailarines del sistema, solo los desvincula de la academia
    - Nuevo endpoint `unlinkDancerFromAcademy()` en `dancersApi.js`
    - Indicador visual (badge con icono de enlace) cuando un bailarín está vinculado a múltiples academias
    - Confirmación mejorada explicando que el bailarín no se elimina
    - Icono cambiado de papelera (cilTrash) a enlace (cilLink) con color warning
  - **Permisos de administrador**:
    - El admin ahora puede editar registros de academias (antes era solo lectura)
    - Útil para asistir a academias que necesiten ayuda
  - **API dancersApi.js**:
    - Nueva función `linkDancerToAcademy(dancerId, academyId)` 
    - Nueva función `unlinkDancerFromAcademy(dancerId, academyId)`
- **Correcciones**:
  - Fix: icono `cilMusic` → `cilMusicNote` en ChoreographiesSection.jsx (3 lugares)

### v1.1.1 - 30/12/2024
- **Mejoras en listado de eventos para academia**:
  - Botones rápidos de "Aceptar" y "Rechazar" en tarjetas de invitación pendiente
  - Modal de confirmación para rechazar invitación con advertencia
  - Feedback visual de acciones (éxito/error)
  - Estado de carga durante procesamiento de acciones
- **Correcciones**:
  - Fix: icono `cilMusic` no exportado → reemplazado por `cilMusicNote`
  - Fix: EventHeader.jsx error de importación

### v1.1.0 - 30/12/2024
- **Gestión bidireccional Academia-Evento**:
  - Nuevo componente `EventAcademiesModal.jsx` en Events.js:
    - Ver academias invitadas a un evento
    - Enviar invitaciones a nuevas academias (bulk)
    - Cancelar invitaciones pendientes
    - Validar registros completados
    - Ver estado de registro de cada academia
    - Enlace directo al registro de cada academia
  - Nuevo componente `AcademyEventsModal.jsx` en Academias.js:
    - Ver eventos de una academia (pasados, próximos, en curso)
    - Filtros por estado de registro y tiempo
    - Asignar academia a nuevos eventos
    - Cancelar invitaciones pendientes
    - Enlace directo al registro en cada evento
  - Integración con botones en tablas:
    - Botón "Ver Academias" en lista de eventos
    - Botón "Ver eventos" en lista de academias
  - Contadores visuales de estados

### v1.0.0 - 30/12/2024
- **Inicial**: Creación del módulo completo
- Implementación de vista de lista de eventos
- Implementación de vista de registro a evento
- Creación de componentes modulares:
  - EventHeader
  - ChoreographiesSection
  - DancersSection
  - CoachesSection
  - TshirtOrderSection
- Creación de servicios API:
  - eventAcademiesApi
  - choreographiesApi
  - choreographyDancersApi
  - eventAcademyCoachesApi
  - ordersApi
  - academyEventRegistrationApi
  - catalogsApi
- Configuración de rutas y navegación
- Implementación de control de acceso por roles
- Soporte para administradores con selector de academia

---

## �📚 Referencias

- [Contexto de Backend](./frontend_academy_view_context.md)
- [Sistema de Permisos](./fromback_frontend_permissions_context.md)
- [Relación Academia-Usuarios](./fromback_academy_relation_users.md)
