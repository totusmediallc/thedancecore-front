import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilFilter,
  cilReload,
  cilSearch,
  cilShieldAlt,
  cilUser,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { usePermissions } from '../../../hooks/usePermissions'
import {
  listPermissions,
  listPermissionModules,
  getPermissionsByRole,
} from '../../../services/permissionsApi'
import { listUsers } from '../../../services/usersApi'
import {
  PERMISSIONS,
  USER_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  MODULE_LABELS,
  getPermissionLabel,
} from '../../../config/permissions'

const PermissionsManagement = () => {
  const { hasPermission } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE_PERMISSIONS)

  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Datos
  const [permissions, setPermissions] = useState([])
  const [modules, setModules] = useState([])
  const [users, setUsers] = useState([])
  const [selectedRole, setSelectedRole] = useState('')
  const [rolePermissions, setRolePermissions] = useState([])
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [userSearchTerm, setUserSearchTerm] = useState('')

  const loadPermissions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [permissionsData, modulesData] = await Promise.all([
        listPermissions(),
        listPermissionModules(),
      ])
      setPermissions(Array.isArray(permissionsData) ? permissionsData : [])
      setModules(Array.isArray(modulesData) ? modulesData : [])
    } catch (requestError) {
      console.error('Error loading permissions:', requestError)
      setError('No se pudieron cargar los permisos del sistema')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const response = await listUsers({ limit: 100 })
      setUsers(Array.isArray(response?.data) ? response.data : [])
    } catch (requestError) {
      console.error('Error loading users:', requestError)
    }
  }, [])

  const loadRolePermissions = useCallback(async (role) => {
    if (!role) {
      setRolePermissions([])
      return
    }
    try {
      const data = await getPermissionsByRole(role)
      setRolePermissions(Array.isArray(data) ? data : [])
    } catch (requestError) {
      console.error('Error loading role permissions:', requestError)
      setRolePermissions([])
    }
  }, [])

  useEffect(() => {
    loadPermissions()
    loadUsers()
  }, [loadPermissions, loadUsers])

  useEffect(() => {
    loadRolePermissions(selectedRole)
  }, [selectedRole, loadRolePermissions])

  // Permisos agrupados por módulo
  const permissionsByModule = useMemo(() => {
    const grouped = {}
    permissions.forEach((permission) => {
      const module = permission.module || 'other'
      if (!grouped[module]) {
        grouped[module] = []
      }
      grouped[module].push(permission)
    })
    return grouped
  }, [permissions])

  // Permisos filtrados
  const filteredPermissions = useMemo(() => {
    let filtered = permissions

    if (moduleFilter) {
      filtered = filtered.filter((p) => p.module === moduleFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.code?.toLowerCase().includes(term) ||
          p.name?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term),
      )
    }

    return filtered
  }, [permissions, moduleFilter, searchTerm])

  // Usuarios filtrados
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return users
    const term = userSearchTerm.toLowerCase()
    return users.filter(
      (u) =>
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term),
    )
  }, [users, userSearchTerm])

  if (!canManage) {
    return (
      <CRow className="justify-content-center">
        <CCol md={8} lg={6}>
          <CAlert color="warning" className="mt-4">
            No tienes permisos para acceder a la gestión de permisos.
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
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
              <div>
                <h2 className="h5 mb-1">
                  <CIcon icon={cilShieldAlt} className="me-2" />
                  Gestión de Permisos
                </h2>
                <p className="text-body-secondary mb-0">
                  Administra los permisos del sistema y asignaciones a usuarios.
                </p>
              </div>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => {
                  loadPermissions()
                  loadUsers()
                }}
                disabled={isLoading}
              >
                <CIcon icon={cilReload} className="me-2" /> Actualizar
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" className="mb-4" dismissible onClose={() => setError(null)}>
                {error}
              </CAlert>
            )}

            <CNav variant="tabs" className="mb-4">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'overview'}
                  onClick={() => setActiveTab('overview')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilShieldAlt} className="me-2" />
                  Catálogo de Permisos
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'roles'}
                  onClick={() => setActiveTab('roles')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilCheckCircle} className="me-2" />
                  Permisos por Rol
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'users'}
                  onClick={() => setActiveTab('users')}
                  style={{ cursor: 'pointer' }}
                >
                  <CIcon icon={cilUser} className="me-2" />
                  Permisos de Usuarios
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              {/* Tab: Catálogo de Permisos */}
              <CTabPane visible={activeTab === 'overview'}>
                <CRow className="g-3 mb-4">
                  <CCol xs={12} md={4}>
                    <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
                      Buscar permiso
                    </CFormLabel>
                    <div className="position-relative">
                      <CFormInput
                        type="search"
                        placeholder="Código, nombre o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </CCol>
                  <CCol xs={12} md={4}>
                    <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
                      Filtrar por módulo
                    </CFormLabel>
                    <CFormSelect
                      value={moduleFilter}
                      onChange={(e) => setModuleFilter(e.target.value)}
                    >
                      <option value="">Todos los módulos</option>
                      {modules.map((module) => (
                        <option key={module} value={module}>
                          {MODULE_LABELS[module] || module}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol xs={12} md={4} className="d-flex align-items-end">
                    <div className="text-body-secondary">
                      <strong>{filteredPermissions.length}</strong> permisos encontrados
                    </div>
                  </CCol>
                </CRow>

                {isLoading ? (
                  <div className="text-center py-5">
                    <CSpinner color="primary" />
                    <p className="mt-2 text-body-secondary">Cargando permisos...</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <CTable hover striped>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Código</CTableHeaderCell>
                          <CTableHeaderCell>Nombre</CTableHeaderCell>
                          <CTableHeaderCell>Módulo</CTableHeaderCell>
                          <CTableHeaderCell>Descripción</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {filteredPermissions.length === 0 ? (
                          <CTableRow>
                            <CTableDataCell colSpan={4} className="text-center py-4 text-body-secondary">
                              No se encontraron permisos
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          filteredPermissions.map((permission) => (
                            <CTableRow key={permission.id || permission.code}>
                              <CTableDataCell>
                                <code className="text-primary">{permission.code}</code>
                              </CTableDataCell>
                              <CTableDataCell className="fw-medium">
                                {permission.name}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color="secondary">
                                  {MODULE_LABELS[permission.module] || permission.module}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="text-body-secondary">
                                {permission.description || '—'}
                              </CTableDataCell>
                            </CTableRow>
                          ))
                        )}
                      </CTableBody>
                    </CTable>
                  </div>
                )}
              </CTabPane>

              {/* Tab: Permisos por Rol */}
              <CTabPane visible={activeTab === 'roles'}>
                <CRow className="g-4">
                  <CCol xs={12} md={4}>
                    <CCard className="h-100">
                      <CCardHeader className="bg-light">
                        <strong>Roles del Sistema</strong>
                      </CCardHeader>
                      <CListGroup flush>
                        {Object.entries(USER_ROLES).map(([key, role]) => (
                          <CListGroupItem
                            key={role}
                            action
                            active={selectedRole === role}
                            onClick={() => setSelectedRole(role)}
                            className="d-flex justify-content-between align-items-center"
                            style={{ cursor: 'pointer' }}
                          >
                            <div>
                              <CBadge color={ROLE_COLORS[role]} className="me-2">
                                {ROLE_LABELS[role]}
                              </CBadge>
                            </div>
                            {selectedRole === role && (
                              <CIcon icon={cilCheckCircle} className="text-primary" />
                            )}
                          </CListGroupItem>
                        ))}
                      </CListGroup>
                    </CCard>
                  </CCol>
                  <CCol xs={12} md={8}>
                    <CCard className="h-100">
                      <CCardHeader className="bg-light d-flex justify-content-between align-items-center">
                        <strong>
                          {selectedRole
                            ? `Permisos de ${ROLE_LABELS[selectedRole]}`
                            : 'Selecciona un rol'}
                        </strong>
                        {selectedRole && (
                          <CBadge color="info">{rolePermissions.length} permisos</CBadge>
                        )}
                      </CCardHeader>
                      <CCardBody style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {!selectedRole ? (
                          <div className="text-center py-5 text-body-secondary">
                            <CIcon icon={cilShieldAlt} size="3xl" className="mb-3 opacity-50" />
                            <p>Selecciona un rol para ver sus permisos por defecto</p>
                          </div>
                        ) : rolePermissions.length === 0 ? (
                          <div className="text-center py-5 text-body-secondary">
                            <p>Este rol no tiene permisos asignados</p>
                          </div>
                        ) : (
                          <CRow className="g-2">
                            {Object.entries(
                              rolePermissions.reduce((acc, perm) => {
                                const module = perm.module || 'other'
                                if (!acc[module]) acc[module] = []
                                acc[module].push(perm)
                                return acc
                              }, {}),
                            ).map(([module, perms]) => (
                              <CCol xs={12} key={module}>
                                <div className="border rounded p-3 mb-2">
                                  <h6 className="text-body-secondary mb-2">
                                    {MODULE_LABELS[module] || module}
                                  </h6>
                                  <div className="d-flex flex-wrap gap-2">
                                    {perms.map((perm) => (
                                      <CBadge
                                        key={perm.code}
                                        color="success"
                                        className="py-2 px-3"
                                        title={perm.description}
                                      >
                                        <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                                        {perm.name || getPermissionLabel(perm.code)}
                                      </CBadge>
                                    ))}
                                  </div>
                                </div>
                              </CCol>
                            ))}
                          </CRow>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              </CTabPane>

              {/* Tab: Permisos de Usuarios */}
              <CTabPane visible={activeTab === 'users'}>
                <CRow className="g-3 mb-4">
                  <CCol xs={12} md={6}>
                    <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
                      Buscar usuario
                    </CFormLabel>
                    <CFormInput
                      type="search"
                      placeholder="Nombre, apellido o correo..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </CCol>
                  <CCol xs={12} md={6} className="d-flex align-items-end">
                    <div className="text-body-secondary">
                      <strong>{filteredUsers.length}</strong> usuarios encontrados
                    </div>
                  </CCol>
                </CRow>

                <div className="table-responsive">
                  <CTable hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Usuario</CTableHeaderCell>
                        <CTableHeaderCell>Correo</CTableHeaderCell>
                        <CTableHeaderCell>Rol</CTableHeaderCell>
                        <CTableHeaderCell>Academia</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {filteredUsers.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center py-4 text-body-secondary">
                            No se encontraron usuarios
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <CTableRow key={user.id}>
                            <CTableDataCell>
                              <div className="fw-medium">
                                {user.firstName} {user.lastName}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>{user.email}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={ROLE_COLORS[user.role]}>
                                {ROLE_LABELS[user.role] || user.role}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              {user.academy?.name || <span className="text-body-secondary">—</span>}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <Link
                                to={`/admin/permisos/usuario/${user.id}`}
                                className="btn btn-sm btn-primary"
                              >
                                <CIcon icon={cilShieldAlt} className="me-1" />
                                Gestionar permisos
                              </Link>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </div>
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default PermissionsManagement
