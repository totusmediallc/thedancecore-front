import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'
import { usePermissions } from '../hooks/usePermissions'

export const AppSidebarNav = ({ items }) => {
  const { hasPermission, hasAnyPermission, hasRole, isAdmin } = usePermissions()

  /**
   * Verifica si un item del menú debe mostrarse según permisos y roles
   */
  const canShowItem = (item) => {
    // Si no tiene restricciones, mostrar
    if (!item.permission && !item.roles) {
      return true
    }

    // Si tiene roles definidos, verificar estrictamente
    // (incluso admin debe cumplir el rol si está especificado)
    if (item.roles && item.roles.length > 0) {
      if (!hasRole(item.roles)) {
        return false
      }
    }

    // Verificar permisos si están definidos
    if (item.permission) {
      // Admin siempre tiene todos los permisos
      if (isAdmin) {
        return true
      }
      const permissions = Array.isArray(item.permission) ? item.permission : [item.permission]
      if (!hasAnyPermission(permissions)) {
        return false
      }
    }

    return true
  }

  /**
   * Filtra recursivamente los items del menú
   */
  const filterItems = (itemList) => {
    if (!itemList) return []

    return itemList.reduce((acc, item) => {
      // Verificar si el item debe mostrarse
      if (!canShowItem(item)) {
        return acc
      }

      // Si tiene sub-items, filtrarlos también
      if (item.items && item.items.length > 0) {
        const filteredSubItems = filterItems(item.items)
        // Solo mostrar el grupo si tiene al menos un sub-item visible
        if (filteredSubItems.length > 0) {
          acc.push({ ...item, items: filteredSubItems })
        }
      } else {
        acc.push(item)
      }

      return acc
    }, [])
  }

  const filteredItems = useMemo(() => filterItems(items), [items, hasPermission, hasRole, isAdmin])

  const navLink = (name, icon, badge, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm">
            {badge.text}
          </CBadge>
        )}
      </>
    )
  }

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, permission, roles, ...rest } = item
    const Component = component
    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            {...(rest.href && { target: '_blank', rel: 'noopener noreferrer' })}
            {...rest}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, permission, roles, ...rest } = item
    const Component = component
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items?.map((subItem, subIndex) =>
          subItem.items ? navGroup(subItem, subIndex) : navItem(subItem, subIndex, true),
        )}
      </Component>
    )
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {filteredItems &&
        filteredItems.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
