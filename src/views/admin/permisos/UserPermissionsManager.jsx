import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCheckCircle,
  cilXCircle,
  cilReload,
  cilSave,
  cilShieldAlt,
  cilTrash,
  cilPlus,
  cilMinus,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTooltip,
} from '@coreui/react'

import { usePermissions } from '../../../hooks/usePermissions'
import { getUser } from '../../../services/usersApi'
import {
  listPermissions,
  getUserPermissionsDetail,
  assignPermissionByCode,
  removeAllPermissionOverrides,
  syncUserPermissions,
} from '../../../services/permissionsApi'
import {
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_COLORS,
  MODULE_LABELS,
  getPermissionLabel,
} from '../../../config/permissions'

const UserPermissionsManager = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { hasPermission, isAdmin } = usePermissions()
  const canManage = hasPermission(PERMISSIONS.USERS_MANAGE_PERMISSIONS)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Datos del usuario
  const [user, setUser] = useState(null)
  const [allPermissions, setAllPermissions] = useState([])
  const [permissionsDetail, setPermissionsDetail] = useState(null)

  // Estado de permisos modificados localmente
  const [localOverrides, setLocalOverrides] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  // Filtros
  const [moduleFilter, setModuleFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal de confirmación
  const [showResetModal, setShowResetModal] = useState(false)

  const loadData = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)
    try {
      const [userData, permissionsData, detailData] = await Promise.all([
        getUser(userId),
        listPermissions(),
        getUserPermissionsDetail(userId),
      ])

      setUser(userData)
      setAllPermissions(Array.isArray(permissionsData) ? permissionsData : [])
      setPermissionsDetail(detailData)

      // Inicializar overrides locales desde el backend
      const overridesMap = {}
      if (detailData?.overrides) {
        detailData.overrides.forEach((override) => {
          overridesMap[override.permission.code] = override.granted
        })
      }
      setLocalOverrides(overridesMap)
      setHasChanges(false)
    } catch (requestError) {
      console.error('Error loading data:', requestError)
      setError('No se pudo cargar la información del usuario')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Permisos del rol base
  const rolePermissionCodes = useMemo(() => {
    if (!permissionsDetail?.rolePermissions) return new Set()
    return new Set(permissionsDetail.rolePermissions.map((p) => p.code))
  }, [permissionsDetail])

  // Calcular permisos efectivos con overrides locales
  const effectivePermissions = useMemo(() => {
    const effective = new Set()

    // Agregar permisos del rol
    rolePermissionCodes.forEach((code) => {
      if (localOverrides[code] !== false) {
        effective.add(code)
      }
    })

    // Agregar permisos otorgados como override
    Object.entries(localOverrides).forEach(([code, granted]) => {
      if (granted === true) {
        effective.add(code)
      }
    })

    return effective
  }, [rolePermissionCodes, localOverrides])

  // Agrupar permisos por módulo
  const permissionsByModule = useMemo(() => {
    const grouped = {}
    allPermissions.forEach((permission) => {
      const module = permission.module || 'other'
      if (!grouped[module]) {
        grouped[module] = []
      }
      grouped[module].push(permission)
    })
    return grouped
  }, [allPermissions])

  // Módulos disponibles
  const modules = useMemo(() => Object.keys(permissionsByModule).sort(), [permissionsByModule])

  // Permisos filtrados
  const filteredPermissionsByModule = useMemo(() => {
    let filtered = { ...permissionsByModule }

    if (moduleFilter) {
      filtered = { [moduleFilter]: permissionsByModule[moduleFilter] || [] }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      Object.keys(filtered).forEach((module) => {
        filtered[module] = filtered[module].filter(
          (p) =>
            p.code?.toLowerCase().includes(term) ||
            p.name?.toLowerCase().includes(term),
        )
        if (filtered[module].length === 0) {
          delete filtered[module]
        }
      })
    }

    return filtered
  }, [permissionsByModule, moduleFilter, searchTerm])

  // Determinar el estado de un permiso
  const getPermissionState = (permissionCode) => {
    const isFromRole = rolePermissionCodes.has(permissionCode)
    const hasOverride = localOverrides[permissionCode] !== undefined
    const isEffective = effectivePermissions.has(permissionCode)

    return {
      isFromRole,
      hasOverride,
      isEffective,
      overrideValue: localOverrides[permissionCode],
    }
  }

  // Manejar cambio de permiso
  const handlePermissionToggle = (permissionCode) => {
    const state = getPermissionState(permissionCode)

    setLocalOverrides((prev) => {
      const newOverrides = { ...prev }

      if (state.isFromRole) {
        // Si es del rol, toggle entre undefined (hereda) y false (revocado)
        if (prev[permissionCode] === false) {
          delete newOverrides[permissionCode]
        } else {
          newOverrides[permissionCode] = false
        }
      } else {
        // Si NO es del rol, toggle entre undefined (no tiene) y true (otorgado)
        if (prev[permissionCode] === true) {
          delete newOverrides[permissionCode]
        } else {
          newOverrides[permissionCode] = true
        }
      }

      return newOverrides
    })

    setHasChanges(true)
  }

  // Guardar cambios
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Calcular permisos finales
      const finalPermissions = Array.from(effectivePermissions)

      await syncUserPermissions(userId, {
        role: user.role,
        permissionCodes: finalPermissions,
      })

      setSuccess('Permisos actualizados correctamente')
      setHasChanges(false)
      
      // Recargar datos
      await loadData()
    } catch (requestError) {
      console.error('Error saving permissions:', requestError)
      setError('No se pudieron guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  // Resetear a permisos del rol
  const handleReset = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    setShowResetModal(false)

    try {
      await removeAllPermissionOverrides(userId)
      setLocalOverrides({})
      setHasChanges(false)
      setSuccess('Permisos reseteados a los valores por defecto del rol')
      await loadData()
    } catch (requestError) {
      console.error('Error resetting permissions:', requestError)
      setError('No se pudieron resetear los permisos')
    } finally {
      setIsSaving(false)
    }
  }

  // Descartar cambios
  const handleDiscard = () => {
    const overridesMap = {}
    if (permissionsDetail?.overrides) {
      permissionsDetail.overrides.forEach((override) => {
        overridesMap[override.permission.code] = override.granted
      })
    }
    setLocalOverrides(overridesMap)
    setHasChanges(false)
  }

  if (!canManage) {
    return (
      <CRow className="justify-content-center">
        <CCol md={8} lg={6}>
          <CAlert color="warning" className="mt-4">
            No tienes permisos para gestionar permisos de usuarios.
          </CAlert>
        </CCol>
      </CRow>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2 text-body-secondary">Cargando información del usuario...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <CRow className="justify-content-center">
        <CCol md={8} lg={6}>
          <CAlert color="danger" className="mt-4">
            No se encontró el usuario solicitado.
            <div className="mt-3">
              <Link to="/admin/permisos" className="btn btn-outline-secondary btn-sm">
                <CIcon icon={cilArrowLeft} className="me-2" />
                Volver a permisos
              </Link>
            </div>
          </CAlert>
        </CCol>
      </CRow>
    )
  }

  const overridesCount = Object.keys(localOverrides).length
  const grantedCount = Object.values(localOverrides).filter((v) => v === true).length
  const revokedCount = Object.values(localOverrides).filter((v) => v === false).length

  return (
    <>
      <CRow className="g-4">
        {/* Header con información del usuario */}
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardBody>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                <div className="d-flex align-items-center gap-3">
                  <Link to="/admin/permisos" className="btn btn-outline-secondary">
                    <CIcon icon={cilArrowLeft} />
                  </Link>
                  <div>
                    <h4 className="mb-1">
                      {user.firstName} {user.lastName}
                    </h4>
                    <p className="text-body-secondary mb-0">{user.email}</p>
                  </div>
                  <CBadge color={ROLE_COLORS[user.role]} className="ms-2 py-2 px-3">
                    {ROLE_LABELS[user.role]}
                  </CBadge>
                  {user.academy && (
                    <CBadge color="secondary" className="py-2 px-3">
                      {user.academy.name}
                    </CBadge>
                  )}
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {hasChanges && (
                    <CButton
                      color="secondary"
                      variant="outline"
                      onClick={handleDiscard}
                      disabled={isSaving}
                    >
                      Descartar cambios
                    </CButton>
                  )}
                  <CButton
                    color="warning"
                    variant="outline"
                    onClick={() => setShowResetModal(true)}
                    disabled={isSaving || overridesCount === 0}
                  >
                    <CIcon icon={cilTrash} className="me-2" />
                    Resetear a rol
                  </CButton>
                  <CButton
                    color="primary"
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilSave} className="me-2" />
                        Guardar cambios
                      </>
                    )}
                  </CButton>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Alertas */}
        {error && (
          <CCol xs={12}>
            <CAlert color="danger" dismissible onClose={() => setError(null)}>
              {error}
            </CAlert>
          </CCol>
        )}
        {success && (
          <CCol xs={12}>
            <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
              {success}
            </CAlert>
          </CCol>
        )}

        {/* Resumen de permisos */}
        <CCol xs={12}>
          <CRow className="g-3">
            <CCol xs={6} md={3}>
              <CCard className="text-center h-100">
                <CCardBody>
                  <h2 className="text-primary mb-0">{effectivePermissions.size}</h2>
                  <small className="text-body-secondary">Permisos efectivos</small>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={6} md={3}>
              <CCard className="text-center h-100">
                <CCardBody>
                  <h2 className="text-info mb-0">{rolePermissionCodes.size}</h2>
                  <small className="text-body-secondary">Del rol base</small>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={6} md={3}>
              <CCard className="text-center h-100">
                <CCardBody>
                  <h2 className="text-success mb-0">{grantedCount}</h2>
                  <small className="text-body-secondary">Otorgados extra</small>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol xs={6} md={3}>
              <CCard className="text-center h-100">
                <CCardBody>
                  <h2 className="text-danger mb-0">{revokedCount}</h2>
                  <small className="text-body-secondary">Revocados</small>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CCol>

        {/* Filtros */}
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardBody>
              <CRow className="g-3">
                <CCol xs={12} md={4}>
                  <CFormInput
                    type="search"
                    placeholder="Buscar permiso..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CCol>
                <CCol xs={12} md={4}>
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
                <CCol xs={12} md={4}>
                  <div className="d-flex gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success-subtle text-success border border-success">
                        <CIcon icon={cilCheckCircle} size="sm" />
                      </span>
                      <small>Del rol</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-primary-subtle text-primary border border-primary">
                        <CIcon icon={cilPlus} size="sm" />
                      </span>
                      <small>Otorgado</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-danger-subtle text-danger border border-danger">
                        <CIcon icon={cilXCircle} size="sm" />
                      </span>
                      <small>Revocado</small>
                    </div>
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Lista de permisos por módulo */}
        <CCol xs={12}>
          {Object.entries(filteredPermissionsByModule).map(([module, permissions]) => (
            <CCard key={module} className="shadow-sm border-0 mb-3">
              <CCardHeader className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>
                    <CIcon icon={cilShieldAlt} className="me-2" />
                    {MODULE_LABELS[module] || module}
                  </strong>
                  <CBadge color="secondary">{permissions.length} permisos</CBadge>
                </div>
              </CCardHeader>
              <CCardBody className="p-0">
                <CListGroup flush>
                  {permissions.map((permission) => {
                    const state = getPermissionState(permission.code)
                    let badgeColor = 'secondary'
                    let badgeIcon = null
                    let statusText = 'Sin acceso'

                    if (state.isEffective) {
                      if (state.hasOverride && state.overrideValue === true) {
                        badgeColor = 'primary'
                        badgeIcon = cilPlus
                        statusText = 'Otorgado extra'
                      } else if (state.isFromRole) {
                        badgeColor = 'success'
                        badgeIcon = cilCheckCircle
                        statusText = 'Del rol'
                      }
                    } else if (state.hasOverride && state.overrideValue === false) {
                      badgeColor = 'danger'
                      badgeIcon = cilXCircle
                      statusText = 'Revocado'
                    }

                    return (
                      <CListGroupItem
                        key={permission.code}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div className="d-flex align-items-center gap-3">
                          <CFormCheck
                            type="switch"
                            id={`perm-${permission.code}`}
                            checked={state.isEffective}
                            onChange={() => handlePermissionToggle(permission.code)}
                            disabled={isSaving}
                          />
                          <div>
                            <div className="fw-medium">{permission.name}</div>
                            <small className="text-body-secondary">
                              <code>{permission.code}</code>
                              {permission.description && ` — ${permission.description}`}
                            </small>
                          </div>
                        </div>
                        <CTooltip content={statusText}>
                          <CBadge
                            color={badgeColor}
                            className={`py-2 px-3 ${badgeColor === 'secondary' ? 'bg-light text-secondary border' : ''}`}
                          >
                            {badgeIcon && <CIcon icon={badgeIcon} size="sm" className="me-1" />}
                            {statusText}
                          </CBadge>
                        </CTooltip>
                      </CListGroupItem>
                    )
                  })}
                </CListGroup>
              </CCardBody>
            </CCard>
          ))}

          {Object.keys(filteredPermissionsByModule).length === 0 && (
            <CCard className="shadow-sm border-0">
              <CCardBody className="text-center py-5 text-body-secondary">
                No se encontraron permisos con los filtros actuales.
              </CCardBody>
            </CCard>
          )}
        </CCol>
      </CRow>

      {/* Modal de confirmación de reset */}
      <CModal visible={showResetModal} onClose={() => setShowResetModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Confirmar reset de permisos</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            ¿Estás seguro de que deseas resetear los permisos de{' '}
            <strong>{user?.firstName} {user?.lastName}</strong>?
          </p>
          <p className="text-body-secondary mb-0">
            Esto eliminará todas las modificaciones de permisos y el usuario tendrá únicamente los
            permisos por defecto de su rol ({ROLE_LABELS[user?.role]}).
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setShowResetModal(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleReset}>
            Resetear permisos
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UserPermissionsManager
