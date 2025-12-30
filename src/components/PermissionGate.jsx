import React from 'react'
import PropTypes from 'prop-types'

import { usePermissions } from '../hooks/usePermissions'

/**
 * Componente para proteger contenido basado en permisos
 * 
 * @example
 * // Un solo permiso
 * <PermissionGate permission="users.create">
 *   <Button>Crear Usuario</Button>
 * </PermissionGate>
 * 
 * // Múltiples permisos (al menos uno)
 * <PermissionGate permission={['users.create', 'users.update']}>
 *   <ActionButtons />
 * </PermissionGate>
 * 
 * // Múltiples permisos (todos requeridos)
 * <PermissionGate permission={['users.create', 'users.update']} requireAll>
 *   <ActionButtons />
 * </PermissionGate>
 * 
 * // Con fallback
 * <PermissionGate permission="users.create" fallback={<AccessDenied />}>
 *   <CreateForm />
 * </PermissionGate>
 * 
 * // Por rol específico
 * <PermissionGate roles={['admin']}>
 *   <AdminPanel />
 * </PermissionGate>
 */
const PermissionGate = ({
  permission,
  permissions,
  requireAll = false,
  roles,
  fallback = null,
  children,
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
  } = usePermissions()

  // Si se especifican roles, verificar primero
  if (roles && roles.length > 0) {
    if (!hasRole(roles)) {
      return fallback
    }
  }

  // Si no se especifican permisos, mostrar contenido
  const permissionList = permission
    ? Array.isArray(permission)
      ? permission
      : [permission]
    : permissions
      ? Array.isArray(permissions)
        ? permissions
        : [permissions]
      : []

  if (permissionList.length === 0) {
    // Si solo se verificó roles y pasó, o no hay restricciones
    if (roles && roles.length > 0) {
      return children
    }
    return children
  }

  // Admin siempre tiene acceso
  if (isAdmin) {
    return children
  }

  // Verificar permisos
  const hasAccess = requireAll
    ? hasAllPermissions(permissionList)
    : hasAnyPermission(permissionList)

  return hasAccess ? children : fallback
}

PermissionGate.propTypes = {
  /** Permiso o array de permisos a verificar */
  permission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  /** Alias para permission (para compatibilidad) */
  permissions: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  /** Si true, requiere todos los permisos; si false, al menos uno */
  requireAll: PropTypes.bool,
  /** Roles permitidos */
  roles: PropTypes.arrayOf(PropTypes.string),
  /** Componente a mostrar si no tiene acceso */
  fallback: PropTypes.node,
  /** Contenido a mostrar si tiene acceso */
  children: PropTypes.node.isRequired,
}

export default PermissionGate
