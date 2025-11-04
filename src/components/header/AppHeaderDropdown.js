import React, { useMemo } from 'react'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from '../../hooks/useAuth'

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
          {user?.role && (
            <span className="badge bg-primary-subtle text-uppercase mt-2 text-primary-emphasis">
              {user.role}
            </span>
          )}
        </div>
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
