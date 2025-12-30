import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilSettings, cilUser, cilShieldAlt } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { ROLE_LABELS, ROLE_COLORS, PERMISSIONS } from '../../config/permissions'

const buildInitials = (user) => {
  if (!user) {
    return 'U'
  }

  const first = user.firstName?.trim()?.[0]
  const last = user.lastName?.trim()?.[0]
  const fallback = user.email?.trim()?.[0]
  const initials = `${first ?? ''}${last ?? ''}`.trim()
  return (initials || fallback || 'U').toUpperCase()
}

const AppHeaderDropdown = () => {
  const { user, logout, isRefreshing } = useAuth()
  const { hasPermission, isAdmin } = usePermissions()

  const initials = useMemo(() => buildInitials(user), [user])
  const fullName = useMemo(() => {
    if (!user) {
      return 'Usuario'
    }
    const composed = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    return composed || user.email
  }, [user])

  const handleLogout = async () => {
    await logout()
  }

  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : null
  const roleColor = user?.role ? ROLE_COLORS[user.role] || 'secondary' : 'secondary'

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar color="primary" size="md" textColor="white">
          {initials}
        </CAvatar>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">Cuenta</CDropdownHeader>
        <div className="px-3 py-2">
          <div className="fw-semibold">{fullName}</div>
          {user?.email && <div className="small text-body-secondary">{user.email}</div>}
          {roleLabel && (
            <CBadge color={roleColor} className="mt-2">
              {roleLabel}
            </CBadge>
          )}
          {user?.academy?.name && (
            <div className="small text-body-secondary mt-1">{user.academy.name}</div>
          )}
        </div>
        <CDropdownDivider />
        <CDropdownItem as={Link} to="/configuraciones/perfil">
          <CIcon icon={cilUser} className="me-2" />
          Mi Perfil
        </CDropdownItem>
        {hasPermission(PERMISSIONS.USERS_MANAGE_PERMISSIONS) && (
          <CDropdownItem as={Link} to="/admin/permisos">
            <CIcon icon={cilShieldAlt} className="me-2" />
            Gestión de Permisos
          </CDropdownItem>
        )}
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={handleLogout} disabled={isRefreshing}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          {isRefreshing ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
