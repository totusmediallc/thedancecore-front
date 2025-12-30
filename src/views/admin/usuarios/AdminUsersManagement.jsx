import React, { useCallback, useEffect, useState } from 'react'

import CIcon from '@coreui/icons-react'
import { cilPeople, cilUser, cilStar } from '@coreui/icons'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CTabContent,
  CTabPane,
} from '@coreui/react'

import { usePermissions } from '../../../hooks/usePermissions'
import { listAcademies } from '../../../services/academiesApi'
import { PERMISSIONS } from '../../../config/permissions'
import { UsersTab, DancersTab, CoachesTab } from './components'

// Tipos de usuario disponibles en el sistema
const USER_TYPES = {
  USERS: 'users',
  DANCERS: 'dancers',
  COACHES: 'coaches',
}

// Configuración de tabs
const TABS_CONFIG = [
  {
    key: USER_TYPES.USERS,
    label: 'Usuarios del Sistema',
    icon: cilUser,
    permission: PERMISSIONS.USERS_READ,
    description: 'Gestiona las cuentas de acceso al sistema',
  },
  {
    key: USER_TYPES.DANCERS,
    label: 'Bailarines',
    icon: cilPeople,
    permission: PERMISSIONS.DANCERS_READ,
    description: 'Gestiona los bailarines asociados a academias',
  },
  {
    key: USER_TYPES.COACHES,
    label: 'Profesores',
    icon: cilStar,
    permission: PERMISSIONS.COACHES_READ,
    description: 'Gestiona los profesores de las academias',
  },
]

const AdminUsersManagement = () => {
  const { hasPermission } = usePermissions()
  const [activeTab, setActiveTab] = useState(USER_TYPES.USERS)
  const [academies, setAcademies] = useState([])
  const [academiesLoading, setAcademiesLoading] = useState(true)

  // Determinar qué tabs están disponibles según permisos
  const availableTabs = TABS_CONFIG.filter((tab) => hasPermission(tab.permission))

  // Si el tab actual no está disponible, seleccionar el primero disponible
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key)
    }
  }, [availableTabs, activeTab])

  const loadAcademies = useCallback(async () => {
    setAcademiesLoading(true)
    try {
      const response = await listAcademies()
      setAcademies(
        Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [],
      )
    } catch (requestError) {
      console.error('Unable to load academies', requestError)
      setAcademies([])
    } finally {
      setAcademiesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAcademies()
  }, [loadAcademies])

  // Obtener info del tab activo
  const activeTabInfo = TABS_CONFIG.find((t) => t.key === activeTab)

  // Si no hay tabs disponibles, mostrar mensaje de error
  if (availableTabs.length === 0) {
    return (
      <CRow className="justify-content-center">
        <CCol md={8} lg={6}>
          <CAlert color="warning" className="mt-4">
            No tienes permisos para acceder a la administración de usuarios.
          </CAlert>
        </CCol>
      </CRow>
    )
  }

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard className="shadow-sm border-0">
          <CCardHeader>
            <div className="mb-3">
              <h2 className="h5 mb-1">Administración de Personas</h2>
              <p className="text-body-secondary mb-0">
                Gestiona usuarios del sistema, bailarines y profesores desde un solo lugar.
              </p>
            </div>

            {/* Tabs de navegación */}
            <CNav variant="tabs" role="tablist" className="card-header-tabs">
              {availableTabs.map((tab) => (
                <CNavItem key={tab.key} role="presentation">
                  <CNavLink
                    active={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={tab.icon} className="me-2" />
                    {tab.label}
                  </CNavLink>
                </CNavItem>
              ))}
            </CNav>
          </CCardHeader>

          <CCardBody>
            {/* Descripción del tab activo */}
            {activeTabInfo && (
              <p className="text-body-secondary mb-4">{activeTabInfo.description}</p>
            )}

            {/* Contenido de los tabs */}
            <CTabContent>
              <CTabPane role="tabpanel" visible={activeTab === USER_TYPES.USERS}>
                {activeTab === USER_TYPES.USERS && <UsersTab academies={academies} />}
              </CTabPane>

              <CTabPane role="tabpanel" visible={activeTab === USER_TYPES.DANCERS}>
                {activeTab === USER_TYPES.DANCERS && <DancersTab academies={academies} />}
              </CTabPane>

              <CTabPane role="tabpanel" visible={activeTab === USER_TYPES.COACHES}>
                {activeTab === USER_TYPES.COACHES && <CoachesTab academies={academies} />}
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AdminUsersManagement
