/**
 * Configuración de permisos del sistema
 * Basado en el documento frontend_permissions_context.md
 */

// Roles disponibles en el sistema
export const USER_ROLES = {
  ADMIN: 'admin',
  ACADEMY: 'academy',
  TEACHER: 'teacher',
  DANCER: 'dancer',
}

// Etiquetas para mostrar los roles en la UI
export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.ACADEMY]: 'Academia',
  [USER_ROLES.TEACHER]: 'Profesor',
  [USER_ROLES.DANCER]: 'Bailarín',
}

// Colores para badges de roles
export const ROLE_COLORS = {
  [USER_ROLES.ADMIN]: 'danger',
  [USER_ROLES.ACADEMY]: 'primary',
  [USER_ROLES.TEACHER]: 'success',
  [USER_ROLES.DANCER]: 'info',
}

// Módulos del sistema
export const PERMISSION_MODULES = {
  USERS: 'users',
  ACADEMIES: 'academies',
  EVENTS: 'events',
  COACHES: 'coaches',
  DANCERS: 'dancers',
  CHOREOGRAPHIES: 'choreographies',
  ORDERS: 'orders',
  CATALOGS: 'catalogs',
  LOCATIONS: 'locations',
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',
}

// Etiquetas para módulos
export const MODULE_LABELS = {
  [PERMISSION_MODULES.USERS]: 'Usuarios',
  [PERMISSION_MODULES.ACADEMIES]: 'Academias',
  [PERMISSION_MODULES.EVENTS]: 'Eventos',
  [PERMISSION_MODULES.COACHES]: 'Profesores',
  [PERMISSION_MODULES.DANCERS]: 'Bailarines',
  [PERMISSION_MODULES.CHOREOGRAPHIES]: 'Coreografías',
  [PERMISSION_MODULES.ORDERS]: 'Pedidos',
  [PERMISSION_MODULES.CATALOGS]: 'Catálogos',
  [PERMISSION_MODULES.LOCATIONS]: 'Ubicaciones',
  [PERMISSION_MODULES.DASHBOARD]: 'Dashboard',
  [PERMISSION_MODULES.REPORTS]: 'Reportes',
}

// Acciones disponibles
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  VIEW: 'view',
  MANAGE_PERMISSIONS: 'manage_permissions',
}

// Etiquetas para acciones
export const ACTION_LABELS = {
  [PERMISSION_ACTIONS.CREATE]: 'Crear',
  [PERMISSION_ACTIONS.READ]: 'Ver',
  [PERMISSION_ACTIONS.UPDATE]: 'Actualizar',
  [PERMISSION_ACTIONS.DELETE]: 'Eliminar',
  [PERMISSION_ACTIONS.MANAGE]: 'Gestionar',
  [PERMISSION_ACTIONS.VIEW]: 'Visualizar',
  [PERMISSION_ACTIONS.MANAGE_PERMISSIONS]: 'Gestionar permisos',
}

// Códigos de permisos del sistema
export const PERMISSIONS = {
  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_PERMISSIONS: 'users.manage_permissions',

  // Academies
  ACADEMIES_CREATE: 'academies.create',
  ACADEMIES_READ: 'academies.read',
  ACADEMIES_UPDATE: 'academies.update',
  ACADEMIES_DELETE: 'academies.delete',

  // Events
  EVENTS_CREATE: 'events.create',
  EVENTS_READ: 'events.read',
  EVENTS_UPDATE: 'events.update',
  EVENTS_DELETE: 'events.delete',

  // Coaches
  COACHES_CREATE: 'coaches.create',
  COACHES_READ: 'coaches.read',
  COACHES_UPDATE: 'coaches.update',
  COACHES_DELETE: 'coaches.delete',

  // Dancers
  DANCERS_CREATE: 'dancers.create',
  DANCERS_READ: 'dancers.read',
  DANCERS_UPDATE: 'dancers.update',
  DANCERS_DELETE: 'dancers.delete',

  // Choreographies
  CHOREOGRAPHIES_CREATE: 'choreographies.create',
  CHOREOGRAPHIES_READ: 'choreographies.read',
  CHOREOGRAPHIES_UPDATE: 'choreographies.update',
  CHOREOGRAPHIES_DELETE: 'choreographies.delete',

  // Orders
  ORDERS_CREATE: 'orders.create',
  ORDERS_READ: 'orders.read',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',

  // Catalogs
  CATALOGS_MANAGE: 'catalogs.manage',

  // Locations
  LOCATIONS_READ: 'locations.read',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Reports
  REPORTS_VIEW: 'reports.view',
}

// Roles que requieren academia asociada
export const ROLES_REQUIRING_ACADEMY = [
  USER_ROLES.ACADEMY,
  USER_ROLES.TEACHER,
  USER_ROLES.DANCER,
]

// Permisos por defecto según rol
export const DEFAULT_ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.ACADEMY]: [
    PERMISSIONS.ACADEMIES_READ,
    PERMISSIONS.ACADEMIES_UPDATE,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.COACHES_CREATE,
    PERMISSIONS.COACHES_READ,
    PERMISSIONS.COACHES_UPDATE,
    PERMISSIONS.COACHES_DELETE,
    PERMISSIONS.DANCERS_CREATE,
    PERMISSIONS.DANCERS_READ,
    PERMISSIONS.DANCERS_UPDATE,
    PERMISSIONS.DANCERS_DELETE,
    PERMISSIONS.CHOREOGRAPHIES_CREATE,
    PERMISSIONS.CHOREOGRAPHIES_READ,
    PERMISSIONS.CHOREOGRAPHIES_UPDATE,
    PERMISSIONS.CHOREOGRAPHIES_DELETE,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.LOCATIONS_READ,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  [USER_ROLES.TEACHER]: [
    PERMISSIONS.ACADEMIES_READ,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.COACHES_READ,
    PERMISSIONS.DANCERS_CREATE,
    PERMISSIONS.DANCERS_READ,
    PERMISSIONS.DANCERS_UPDATE,
    PERMISSIONS.CHOREOGRAPHIES_CREATE,
    PERMISSIONS.CHOREOGRAPHIES_READ,
    PERMISSIONS.CHOREOGRAPHIES_UPDATE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.LOCATIONS_READ,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  [USER_ROLES.DANCER]: [
    PERMISSIONS.ACADEMIES_READ,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.DANCERS_READ,
    PERMISSIONS.CHOREOGRAPHIES_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.LOCATIONS_READ,
    PERMISSIONS.DASHBOARD_VIEW,
  ],
}

// Jerarquía de roles (mayor número = mayor nivel)
export const ROLE_HIERARCHY = {
  [USER_ROLES.ADMIN]: 4,
  [USER_ROLES.ACADEMY]: 3,
  [USER_ROLES.TEACHER]: 2,
  [USER_ROLES.DANCER]: 1,
}

/**
 * Verifica si un rol es superior a otro
 */
export const isRoleHigherOrEqual = (roleA, roleB) => {
  return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0)
}

/**
 * Obtiene el label de un permiso
 */
export const getPermissionLabel = (permissionCode) => {
  if (!permissionCode) return ''
  const [module, action] = permissionCode.split('.')
  const moduleLabel = MODULE_LABELS[module] || module
  const actionLabel = ACTION_LABELS[action] || action
  return `${actionLabel} ${moduleLabel.toLowerCase()}`
}

export default {
  USER_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  PERMISSION_MODULES,
  MODULE_LABELS,
  PERMISSION_ACTIONS,
  ACTION_LABELS,
  PERMISSIONS,
  ROLES_REQUIRING_ACADEMY,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  isRoleHigherOrEqual,
  getPermissionLabel,
}
