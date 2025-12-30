import { useCallback, useMemo } from 'react'

import { useAuth } from './useAuth'
import { USER_ROLES } from '../config/permissions'

/**
 * Hook para verificar permisos del usuario actual
 * 
 * @example
 * const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermissions()
 * 
 * // Verificar un permiso
 * if (hasPermission('users.create')) { ... }
 * 
 * // Verificar múltiples permisos (al menos uno)
 * if (hasAnyPermission(['users.create', 'users.update'])) { ... }
 * 
 * // Verificar múltiples permisos (todos)
 * if (hasAllPermissions(['users.create', 'users.update'])) { ... }
 */
export const usePermissions = () => {
  const { user } = useAuth()

  /**
   * El usuario actual es administrador
   */
  const isAdmin = useMemo(() => {
    return user?.role === USER_ROLES.ADMIN
  }, [user?.role])

  /**
   * El usuario actual es una academia
   */
  const isAcademy = useMemo(() => {
    return user?.role === USER_ROLES.ACADEMY
  }, [user?.role])

  /**
   * El usuario actual es un profesor
   */
  const isTeacher = useMemo(() => {
    return user?.role === USER_ROLES.TEACHER
  }, [user?.role])

  /**
   * El usuario actual es un bailarín
   */
  const isDancer = useMemo(() => {
    return user?.role === USER_ROLES.DANCER
  }, [user?.role])

  /**
   * Obtiene los permisos del usuario actual
   */
  const permissions = useMemo(() => {
    return user?.permissions ?? []
  }, [user?.permissions])

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} permission - Código del permiso (ej: 'users.create')
   * @returns {boolean}
   */
  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false
      // Admin siempre tiene todos los permisos
      if (user.role === USER_ROLES.ADMIN) return true
      return permissions.includes(permission)
    },
    [user, permissions],
  )

  /**
   * Verifica si el usuario tiene al menos uno de los permisos especificados
   * @param {string[]} permissionList - Lista de códigos de permisos
   * @returns {boolean}
   */
  const hasAnyPermission = useCallback(
    (permissionList) => {
      if (!user) return false
      if (!Array.isArray(permissionList) || permissionList.length === 0) return false
      // Admin siempre tiene todos los permisos
      if (user.role === USER_ROLES.ADMIN) return true
      return permissionList.some((permission) => permissions.includes(permission))
    },
    [user, permissions],
  )

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param {string[]} permissionList - Lista de códigos de permisos
   * @returns {boolean}
   */
  const hasAllPermissions = useCallback(
    (permissionList) => {
      if (!user) return false
      if (!Array.isArray(permissionList) || permissionList.length === 0) return false
      // Admin siempre tiene todos los permisos
      if (user.role === USER_ROLES.ADMIN) return true
      return permissionList.every((permission) => permissions.includes(permission))
    },
    [user, permissions],
  )

  /**
   * Verifica si el usuario tiene uno de los roles especificados
   * @param {string[]} roles - Lista de roles
   * @returns {boolean}
   */
  const hasRole = useCallback(
    (roles) => {
      if (!user) return false
      const roleList = Array.isArray(roles) ? roles : [roles]
      return roleList.includes(user.role)
    },
    [user],
  )

  /**
   * Verifica si el usuario puede gestionar permisos
   * @returns {boolean}
   */
  const canManagePermissions = useMemo(() => {
    return hasPermission('users.manage_permissions')
  }, [hasPermission])

  /**
   * Verifica si el usuario puede gestionar usuarios
   * @returns {boolean}
   */
  const canManageUsers = useMemo(() => {
    return hasAnyPermission(['users.create', 'users.update', 'users.delete', 'users.read'])
  }, [hasAnyPermission])

  return {
    // Estado del usuario
    user,
    permissions,
    role: user?.role ?? null,
    academyId: user?.academyId ?? null,
    academy: user?.academy ?? null,

    // Verificación de roles
    isAdmin,
    isAcademy,
    isTeacher,
    isDancer,
    hasRole,

    // Verificación de permisos
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Permisos especiales
    canManagePermissions,
    canManageUsers,
  }
}

export default usePermissions
