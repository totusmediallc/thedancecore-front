import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import CIcon from '@coreui/icons-react'
import {
  cilBan,
  cilCheckCircle,
  cilList,
  cilLockLocked,
  cilLowVision,
  cilPencil,
  cilPlus,
  cilReload,
  cilShieldAlt,
  cilTrash,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTooltip,
} from '@coreui/react'

import { useAuth } from '../../../../hooks/useAuth'
import { usePermissions } from '../../../../hooks/usePermissions'
import { HttpError } from '../../../../services/httpClient'
import { createUser, deleteUser, listUsers, updateUser } from '../../../../services/usersApi'
import {
  USER_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLES_REQUIRING_ACADEMY,
  PERMISSIONS,
} from '../../../../config/permissions'
import PermissionGate from '../../../../components/PermissionGate'

const DEFAULT_FILTERS = {
  search: '',
  role: '',
  isActive: '',
  page: 1,
  limit: 10,
}

const ROLE_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: USER_ROLES.ADMIN, label: ROLE_LABELS[USER_ROLES.ADMIN] },
  { value: USER_ROLES.ACADEMY, label: ROLE_LABELS[USER_ROLES.ACADEMY] },
  { value: USER_ROLES.TEACHER, label: ROLE_LABELS[USER_ROLES.TEACHER] },
  { value: USER_ROLES.DANCER, label: ROLE_LABELS[USER_ROLES.DANCER] },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
]

const LIMIT_OPTIONS = [10, 20, 50, 100]
const PASSWORD_MIN_LENGTH = 8

const formatDate = (value) => {
  if (!value) {
    return '—'
  }

  try {
    const date = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch (error) {
    console.error('Unable to format date', error)
    return '—'
  }
}

const generatePassword = (length = 12) => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  const cryptoObj = window.crypto || window.msCrypto
  if (cryptoObj?.getRandomValues) {
    const randomValues = new Uint32Array(length)
    cryptoObj.getRandomValues(randomValues)
    return Array.from(randomValues, (value) => charset[value % charset.length]).join('')
  }

  let password = ''
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * charset.length)
    password += charset.charAt(randomIndex)
  }
  return password
}

const getErrorMessage = (error, fallback = 'Ocurrió un error inesperado') => {
  if (!error) {
    return fallback
  }

  if (error instanceof HttpError) {
    return error.data?.message ?? error.message ?? fallback
  }

  if (typeof error === 'string') {
    return error
  }

  return error.message ?? fallback
}

const initialFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: USER_ROLES.DANCER,
  academyId: '',
  isActive: true,
  password: '',
}

const UserFormModal = ({ mode, visible, submitting, onClose, onSubmit, user, academies = [] }) => {
  const isEditMode = mode === 'edit'

  // Estado inicial calculado una vez al montar (el componente se remonta via key cuando cambia visible/user)
  const getInitialState = () =>
    isEditMode && user
      ? {
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          email: user.email ?? '',
          role: user.role ?? USER_ROLES.DANCER,
          academyId: user.academyId ?? '',
          isActive: Boolean(user.isActive),
          password: '',
        }
      : initialFormState

  const [formState, setFormState] = useState(getInitialState)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const requiresAcademy = ROLES_REQUIRING_ACADEMY.includes(formState.role)

  const handleChange = (field) => (event) => {
    const value = field === 'isActive' ? event.target.checked : event.target.value
    setFormState((prev) => {
      const newState = { ...prev, [field]: value }
      if (field === 'role' && !ROLES_REQUIRING_ACADEMY.includes(value)) {
        newState.academyId = ''
      }
      return newState
    })
  }

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.firstName.trim()) {
      validationErrors.firstName = 'El nombre es obligatorio'
    }

    if (!formState.email.trim()) {
      validationErrors.email = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      validationErrors.email = 'El correo no tiene un formato válido'
    }

    if (!isEditMode || formState.password) {
      if (!formState.password) {
        validationErrors.password = 'La contraseña es obligatoria'
      } else if (formState.password.length < PASSWORD_MIN_LENGTH) {
        validationErrors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
      }
    }

    if (!Object.values(USER_ROLES).includes(formState.role)) {
      validationErrors.role = 'Selecciona un rol válido'
    }

    if (requiresAcademy && !formState.academyId) {
      validationErrors.academyId = 'Debes seleccionar una academia para este rol'
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [formState, isEditMode, requiresAcademy])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    const payload = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim() || undefined,
      email: formState.email.trim().toLowerCase(),
      role: formState.role,
      isActive: Boolean(formState.isActive),
    }

    if (requiresAcademy && formState.academyId) {
      payload.academyId = formState.academyId
    }

    if (formState.password) {
      payload.password = formState.password
    }

    onSubmit(payload)
  }

  const handleGeneratePassword = () => {
    const password = generatePassword()
    setFormState((prev) => ({ ...prev, password }))
    setShowPassword(true)
  }

  const title = isEditMode ? 'Editar usuario' : 'Crear usuario'

  return (
    <CModal
      alignment="center"
      backdrop="static"
      visible={visible}
      onClose={submitting ? undefined : onClose}
      size="lg"
    >
      <CForm onSubmit={handleSubmit}>
        <CModalHeader closeButton={!submitting}>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel htmlFor="user-first-name">Nombre *</CFormLabel>
              <CFormInput
                id="user-first-name"
                value={formState.firstName}
                onChange={handleChange('firstName')}
                disabled={submitting}
                invalid={Boolean(errors.firstName)}
                autoFocus
                placeholder="Nombre"
              />
              {errors.firstName ? (
                <div className="invalid-feedback d-block">{errors.firstName}</div>
              ) : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="user-last-name">Apellido</CFormLabel>
              <CFormInput
                id="user-last-name"
                value={formState.lastName}
                onChange={handleChange('lastName')}
                disabled={submitting}
                placeholder="Apellido"
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="user-email">Correo electrónico *</CFormLabel>
              <CFormInput
                id="user-email"
                type="email"
                value={formState.email}
                onChange={handleChange('email')}
                disabled={submitting}
                invalid={Boolean(errors.email)}
                placeholder="usuario@ejemplo.com"
              />
              {errors.email ? <div className="invalid-feedback d-block">{errors.email}</div> : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="user-role">Rol *</CFormLabel>
              <CFormSelect
                id="user-role"
                value={formState.role}
                onChange={handleChange('role')}
                disabled={submitting}
                invalid={Boolean(errors.role)}
              >
                {Object.entries(USER_ROLES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </CFormSelect>
              {errors.role ? <div className="invalid-feedback d-block">{errors.role}</div> : null}
            </CCol>
            {requiresAcademy && (
              <CCol md={6}>
                <CFormLabel htmlFor="user-academy">Academia *</CFormLabel>
                <CFormSelect
                  id="user-academy"
                  value={formState.academyId}
                  onChange={handleChange('academyId')}
                  disabled={submitting}
                  invalid={Boolean(errors.academyId)}
                >
                  <option value="">Selecciona una academia</option>
                  {academies.map((academy) => (
                    <option key={academy.id} value={academy.id}>
                      {academy.name}
                    </option>
                  ))}
                </CFormSelect>
                {errors.academyId ? (
                  <div className="invalid-feedback d-block">{errors.academyId}</div>
                ) : null}
              </CCol>
            )}
            <CCol md={6}>
              <CFormLabel htmlFor="user-password">
                {isEditMode ? 'Cambiar contraseña' : 'Contraseña *'}
              </CFormLabel>
              <CInputGroup>
                <CFormInput
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formState.password}
                  onChange={handleChange('password')}
                  disabled={submitting}
                  invalid={Boolean(errors.password)}
                  placeholder={
                    isEditMode ? 'Ingresa una nueva contraseña (opcional)' : 'Contraseña segura'
                  }
                />
                <CButton
                  type="button"
                  variant="outline"
                  color="secondary"
                  disabled={submitting}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <CIcon icon={showPassword ? cilLowVision : cilLockLocked} />
                </CButton>
                <CButton
                  type="button"
                  color="dark"
                  variant="outline"
                  disabled={submitting}
                  onClick={handleGeneratePassword}
                >
                  Generar
                </CButton>
              </CInputGroup>
              {errors.password ? (
                <div className="invalid-feedback d-block">{errors.password}</div>
              ) : (
                <small className="text-body-secondary">
                  Mínimo {PASSWORD_MIN_LENGTH} caracteres.
                </small>
              )}
            </CCol>
            <CCol md={6} className="d-flex align-items-end">
              <CFormCheck
                id="user-is-active"
                type="switch"
                label={formState.isActive ? 'Usuario activo' : 'Usuario inactivo'}
                checked={formState.isActive}
                onChange={handleChange('isActive')}
                disabled={submitting}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" disabled={submitting} onClick={onClose}>
            Cancelar
          </CButton>
          <CButton type="submit" color="primary" disabled={submitting}>
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" /> Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const DeleteConfirmModal = ({ visible, onClose, onConfirm, user, submitting }) => (
  <CModal
    alignment="center"
    visible={visible}
    onClose={submitting ? undefined : onClose}
    backdrop="static"
  >
    <CModalHeader closeButton={!submitting}>
      <CModalTitle>Desactivar usuario</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        ¿Estás seguro de que deseas desactivar a{' '}
        <strong>
          {user?.firstName} {user?.lastName}
        </strong>
        ?
      </p>
      <p className="text-body-secondary mb-0">
        La cuenta permanecerá en el sistema pero no podrá iniciar sesión hasta que se reactive.
      </p>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="ghost" disabled={submitting} onClick={onClose}>
        Cancelar
      </CButton>
      <CButton color="danger" disabled={submitting} onClick={onConfirm}>
        {submitting ? (
          <>
            <CSpinner size="sm" className="me-2" /> Desactivando...
          </>
        ) : (
          'Desactivar'
        )}
      </CButton>
    </CModalFooter>
  </CModal>
)

const RoleBadge = ({ role }) => {
  const color = ROLE_COLORS[role] || 'secondary'
  const label = ROLE_LABELS[role] || role
  return (
    <CBadge color={color} className="fw-semibold">
      {label}
    </CBadge>
  )
}

const UsersTab = ({ academies = [] }) => {
  const { user: currentUser } = useAuth()
  const { hasPermission, isAdmin } = usePermissions()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: DEFAULT_FILTERS.limit,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalState, setEditModalState] = useState({ visible: false, user: null })
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState({ visible: false, user: null, submitting: false })

  const canRead = hasPermission(PERMISSIONS.USERS_READ)
  const canCreate = hasPermission(PERMISSIONS.USERS_CREATE)
  const canUpdate = hasPermission(PERMISSIONS.USERS_UPDATE)
  const canDelete = hasPermission(PERMISSIONS.USERS_DELETE)

  const normalizedFilters = useMemo(() => {
    return {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      role: filters.role || undefined,
      isActive: filters.isActive === '' ? undefined : filters.isActive === 'true',
    }
  }, [filters])

  const loadUsers = useCallback(async () => {
    if (!canRead) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await listUsers(normalizedFilters)
      setUsers(Array.isArray(response?.data) ? response.data : [])
      const responseMeta = response?.meta ?? {}
      setMeta({
        page: responseMeta.page ?? filters.page,
        limit: responseMeta.limit ?? filters.limit,
        totalPages: Math.max(responseMeta.totalPages ?? 1, 1),
        total: responseMeta.total ?? 0,
      })
    } catch (requestError) {
      console.error('Unable to load users', requestError)
      setError(getErrorMessage(requestError, 'No fue posible cargar los usuarios'))
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [filters.limit, filters.page, canRead, normalizedFilters])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const resetToFirstPage = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: 1 }))
  }, [])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }))
  }

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSearchInput('')
  }

  const handleLimitChange = (event) => {
    setFilters((prev) => ({ ...prev, limit: Number(event.target.value), page: 1 }))
  }

  const handleRoleFilterChange = (event) => {
    setFilters((prev) => ({ ...prev, role: event.target.value, page: 1 }))
  }

  const handleStatusFilterChange = (event) => {
    setFilters((prev) => ({ ...prev, isActive: event.target.value, page: 1 }))
  }

  const handleRefresh = () => {
    loadUsers()
  }

  const handleCreateSubmit = async (payload) => {
    setActionSubmitting(true)
    setFeedback(null)
    try {
      await createUser(payload)
      setCreateModalOpen(false)
      setFeedback({ type: 'success', message: 'Usuario creado correctamente' })
      await loadUsers()
      if (filters.page !== 1) {
        resetToFirstPage()
      }
    } catch (requestError) {
      console.error('Create user failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo crear el usuario'),
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleEditSubmit = async (payload) => {
    if (!editModalState.user) {
      return
    }

    setActionSubmitting(true)
    setFeedback(null)
    try {
      await updateUser(editModalState.user.id, payload)
      setEditModalState({ visible: false, user: null })
      setFeedback({ type: 'success', message: 'Usuario actualizado correctamente' })
      await loadUsers()
    } catch (requestError) {
      console.error('Update user failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo actualizar el usuario'),
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteState.user) {
      return
    }

    setDeleteState((prev) => ({ ...prev, submitting: true }))
    setFeedback(null)
    try {
      await deleteUser(deleteState.user.id)
      setDeleteState({ visible: false, user: null, submitting: false })
      setFeedback({ type: 'success', message: 'Usuario desactivado correctamente' })
      await loadUsers()
    } catch (requestError) {
      console.error('Delete user failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo desactivar el usuario'),
      })
      setDeleteState((prev) => ({ ...prev, submitting: false }))
    }
  }

  const canEditUser = useCallback(
    (user) => {
      if (!canUpdate) return false
      if (user.role === USER_ROLES.ADMIN && currentUser?.id !== user.id) {
        return isAdmin
      }
      return true
    },
    [canUpdate, currentUser?.id, isAdmin],
  )

  const canDeleteUser = useCallback(
    (user) => {
      if (!canDelete) return false
      if (currentUser?.id === user.id) return false
      if (user.role === USER_ROLES.ADMIN) return false
      return true
    },
    [canDelete, currentUser?.id],
  )

  if (!canRead) {
    return (
      <CAlert color="warning" className="mt-4">
        No tienes permisos para ver usuarios del sistema.
      </CAlert>
    )
  }

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <CButton color="secondary" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <CIcon icon={cilReload} className="me-2" /> Actualizar
        </CButton>
        <PermissionGate permission={PERMISSIONS.USERS_CREATE}>
          <CButton color="primary" onClick={() => setCreateModalOpen(true)}>
            <CIcon icon={cilPlus} className="me-2" /> Nuevo usuario
          </CButton>
        </PermissionGate>
      </div>

      {feedback ? (
        <CAlert
          color={feedback.type}
          className="mb-4"
          onClose={() => setFeedback(null)}
          dismissible
        >
          {feedback.message}
        </CAlert>
      ) : null}

      <CRow className="g-3 align-items-end mb-4">
        <CCol xs={12} lg={4}>
          <CForm onSubmit={handleSearchSubmit} className="d-flex gap-2">
            <CFormInput
              type="search"
              value={searchInput}
              placeholder="Buscar por nombre, apellido o correo"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <CButton color="primary" type="submit" disabled={isLoading}>
              <CIcon icon={cilList} className="me-2" /> Buscar
            </CButton>
          </CForm>
        </CCol>
        <CCol xs={12} sm={4} lg={2}>
          <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
            Rol
          </CFormLabel>
          <CFormSelect value={filters.role} onChange={handleRoleFilterChange} disabled={isLoading}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} sm={4} lg={2}>
          <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
            Estado
          </CFormLabel>
          <CFormSelect
            value={filters.isActive}
            onChange={handleStatusFilterChange}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} sm={4} lg={2} className="d-flex gap-2">
          <div className="flex-grow-1">
            <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
              Por página
            </CFormLabel>
            <CFormSelect value={filters.limit} onChange={handleLimitChange} disabled={isLoading}>
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </CFormSelect>
          </div>
        </CCol>
        <CCol xs={12} lg={2} className="d-flex align-items-end">
          <CButton
            variant="ghost"
            color="secondary"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="w-100"
          >
            Limpiar filtros
          </CButton>
        </CCol>
      </CRow>

      {error ? (
        <CAlert color="danger" className="mb-4">
          {error}
        </CAlert>
      ) : null}

      <div className="table-responsive">
        <CTable hover responsive>
          <CTableHead className="text-nowrap text-body-secondary">
            <CTableRow>
              <CTableHeaderCell>Nombre</CTableHeaderCell>
              <CTableHeaderCell>Correo</CTableHeaderCell>
              <CTableHeaderCell>Rol</CTableHeaderCell>
              <CTableHeaderCell>Academia</CTableHeaderCell>
              <CTableHeaderCell>Estado</CTableHeaderCell>
              <CTableHeaderCell>Último acceso</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {isLoading ? (
              <CTableRow>
                <CTableDataCell colSpan={7} className="text-center py-4">
                  <CSpinner size="sm" className="me-2" /> Cargando usuarios...
                </CTableDataCell>
              </CTableRow>
            ) : users.length === 0 ? (
              <CTableRow>
                <CTableDataCell colSpan={7} className="text-center py-4 text-body-secondary">
                  No se encontraron usuarios con los filtros actuales.
                </CTableDataCell>
              </CTableRow>
            ) : (
              users.map((user) => {
                const isCurrentUser = currentUser?.id === user.id
                const isActive = Boolean(user.isActive)
                return (
                  <CTableRow key={user.id} className="align-middle">
                    <CTableDataCell>
                      <div className="fw-semibold text-body">
                        {user.firstName} {user.lastName}
                      </div>
                      {isCurrentUser ? (
                        <small className="text-body-secondary">Tu sesión actual</small>
                      ) : null}
                    </CTableDataCell>
                    <CTableDataCell>{user.email}</CTableDataCell>
                    <CTableDataCell>
                      <RoleBadge role={user.role} />
                    </CTableDataCell>
                    <CTableDataCell>
                      {user.academy?.name || <span className="text-body-secondary">—</span>}
                    </CTableDataCell>
                    <CTableDataCell>
                      {isActive ? (
                        <CBadge color="success" className="text-white fw-semibold">
                          <CIcon icon={cilCheckCircle} className="me-1" /> Activo
                        </CBadge>
                      ) : (
                        <CBadge color="warning" className="text-dark fw-semibold">
                          <CIcon icon={cilBan} className="me-1" /> Inactivo
                        </CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>{formatDate(user.lastLoginAt)}</CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup role="group" className="justify-content-end">
                        <PermissionGate permission={PERMISSIONS.USERS_UPDATE}>
                          <CTooltip content="Editar usuario">
                            <CButton
                              color="secondary"
                              variant="outline"
                              size="sm"
                              disabled={!canEditUser(user) || isLoading}
                              onClick={() => setEditModalState({ visible: true, user })}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          </CTooltip>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.USERS_MANAGE_PERMISSIONS}>
                          <CTooltip content="Gestionar permisos">
                            <Link
                              to={`/admin/permisos/usuario/${user.id}`}
                              className="btn btn-outline-info btn-sm"
                            >
                              <CIcon icon={cilShieldAlt} />
                            </Link>
                          </CTooltip>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.USERS_DELETE}>
                          <CTooltip content="Desactivar usuario">
                            <CButton
                              color="danger"
                              variant="outline"
                              size="sm"
                              disabled={!canDeleteUser(user) || isLoading}
                              onClick={() =>
                                setDeleteState({ visible: true, user, submitting: false })
                              }
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTooltip>
                        </PermissionGate>
                      </CButtonGroup>
                    </CTableDataCell>
                  </CTableRow>
                )
              })
            )}
          </CTableBody>
        </CTable>
      </div>

      <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mt-4">
        <div className="text-body-secondary small">
          Mostrando {users.length} de {meta.total} usuarios
        </div>
        <CPagination align="end" className="m-0">
          <CPaginationItem
            disabled={filters.page <= 1 || isLoading}
            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
          >
            &laquo;
          </CPaginationItem>
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, index) => {
            let pageNumber
            if (meta.totalPages <= 5) {
              pageNumber = index + 1
            } else if (filters.page <= 3) {
              pageNumber = index + 1
            } else if (filters.page >= meta.totalPages - 2) {
              pageNumber = meta.totalPages - 4 + index
            } else {
              pageNumber = filters.page - 2 + index
            }
            return pageNumber
          }).map((pageNumber) => (
            <CPaginationItem
              key={pageNumber}
              active={pageNumber === filters.page}
              disabled={isLoading}
              onClick={() => setFilters((prev) => ({ ...prev, page: pageNumber }))}
            >
              {pageNumber}
            </CPaginationItem>
          ))}
          <CPaginationItem
            disabled={filters.page >= meta.totalPages || isLoading}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: Math.min(prev.page + 1, Math.max(meta.totalPages, 1)),
              }))
            }
          >
            &raquo;
          </CPaginationItem>
        </CPagination>
      </div>

      <UserFormModal
        key={createModalOpen ? 'create-open' : 'create-closed'}
        mode="create"
        visible={createModalOpen}
        submitting={actionSubmitting}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        academies={academies}
      />
      <UserFormModal
        key={editModalState.visible ? `edit-${editModalState.user?.id ?? 'new'}` : 'edit-hidden'}
        mode="edit"
        visible={editModalState.visible}
        submitting={actionSubmitting}
        onClose={() => setEditModalState({ visible: false, user: null })}
        onSubmit={handleEditSubmit}
        user={editModalState.user}
        academies={academies}
      />
      <DeleteConfirmModal
        visible={deleteState.visible}
        onClose={() => setDeleteState({ visible: false, user: null, submitting: false })}
        onConfirm={handleDeleteConfirm}
        user={deleteState.user}
        submitting={deleteState.submitting}
      />
    </>
  )
}

export default UsersTab
