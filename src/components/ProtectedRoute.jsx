import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import { CSpinner, CAlert, CButton, CCol, CRow } from '@coreui/react'

import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'

/**
 * Componente para proteger rutas basado en autenticación y permisos
 * 
 * @example
 * // Ruta solo autenticada
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * // Ruta con permiso específico
 * <ProtectedRoute permission="users.read">
 *   <UsersPage />
 * </ProtectedRoute>
 * 
 * // Ruta con roles específicos
 * <ProtectedRoute roles={['admin']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({
  children,
  permission,
  permissions,
  requireAll = false,
  roles,
  redirectTo = '/login',
  showAccessDenied = true,
}) => {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
  } = usePermissions()

  // Mostrar spinner mientras carga la sesión
  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <CSpinner color="primary" variant="border" />
      </div>
    )
  }

  // Redirigir a login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  // Verificar roles si se especifican
  if (roles && roles.length > 0 && !isAdmin) {
    if (!hasRole(roles)) {
      if (showAccessDenied) {
        return <AccessDenied />
      }
      return <Navigate to="/dashboard" replace />
    }
  }

  // Verificar permisos si se especifican
  const permissionList = permission
    ? Array.isArray(permission) ? permission : [permission]
    : permissions
      ? Array.isArray(permissions) ? permissions : [permissions]
      : []

  if (permissionList.length > 0 && !isAdmin) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissionList)
      : hasAnyPermission(permissionList)

    if (!hasAccess) {
      if (showAccessDenied) {
        return <AccessDenied />
      }
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

/**
 * Componente de acceso denegado
 */
const AccessDenied = () => {
  return (
    <CRow className="justify-content-center align-items-center min-vh-50">
      <CCol md={8} lg={6}>
        <CAlert color="warning" className="text-center">
          <h4 className="alert-heading">Acceso Denegado</h4>
          <p className="mb-0">
            No tienes los permisos necesarios para acceder a esta sección.
          </p>
          <hr />
          <CButton color="primary" href="/#/dashboard">
            Volver al Dashboard
          </CButton>
        </CAlert>
      </CCol>
    </CRow>
  )
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  /** Permiso o array de permisos requeridos */
  permission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  /** Alias para permission */
  permissions: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  /** Si true, requiere todos los permisos; si false, al menos uno */
  requireAll: PropTypes.bool,
  /** Roles permitidos */
  roles: PropTypes.arrayOf(PropTypes.string),
  /** URL a la que redirigir si no está autenticado */
  redirectTo: PropTypes.string,
  /** Mostrar página de acceso denegado en lugar de redirigir */
  showAccessDenied: PropTypes.bool,
}

export default ProtectedRoute
