import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
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
  CInputGroupText,
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
  CCard,
  CCardBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilList,
  cilLockLocked,
  cilPencil,
  cilPlus,
  cilReload,
  cilTrash,
  cilUser,
  cilUserFollow,
  cilBan,
  cilChart,
  cilWarning,
  cilArrowRight,
} from '@coreui/icons'

import {
  listAcademyUsers,
  createAcademyUser,
  updateAcademyUser,
  deleteAcademyUser,
  activateAcademyUser,
  deactivateAcademyUser,
  resetAcademyUserPassword,
  getAcademyUsersStats,
  transferAcademyUser,
  listAcademies,
} from '../../services/academiesApi'

// Constantes
// Los usuarios de academia solo pueden tener rol 'academy'
// Profesores y bailarines no tienen acceso al sistema

const ROLE_COLORS = {
  academy: 'primary',
}

const LIMIT_OPTIONS = [5, 10, 25, 50]

const DEFAULT_FILTERS = {
  search: '',
  isActive: '',
  page: 1,
  limit: 10,
}

/**
 * Formatea fecha para visualización
 */
const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Extrae mensaje de error de una respuesta
 */
const getErrorMessage = (error, defaultMessage = 'Ha ocurrido un error') => {
  if (typeof error === 'string') return error
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.message) return error.message
  return defaultMessage
}

// ==========================================
// Modal: Formulario de Usuario de Academia
// ==========================================
const UserFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  user,
  academyName,
}) => {
  const isEditMode = mode === 'edit'

  const baseState = useMemo(
    () =>
      isEditMode && user
        ? {
            email: user.email ?? '',
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            role: 'academy', // Los usuarios de academia siempre tienen rol 'academy'
            isActive: user.isActive ?? true,
          }
        : {
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            role: 'academy', // Los usuarios de academia siempre tienen rol 'academy'
            isActive: true,
          },
    [isEditMode, user],
  )

  const [formState, setFormState] = useState(baseState)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
    }
  }, [visible, baseState])

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.email.trim()) {
      validationErrors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      validationErrors.email = 'Email inválido'
    }

    if (!isEditMode && !formState.password) {
      validationErrors.password = 'La contraseña es obligatoria'
    } else if (!isEditMode && formState.password.length < 6) {
      validationErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (!formState.firstName.trim()) {
      validationErrors.firstName = 'El nombre es obligatorio'
    }

    // El rol siempre es 'academy', no necesita validación

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [formState, isEditMode])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      email: formState.email.trim(),
      firstName: formState.firstName.trim(),
      role: formState.role,
      isActive: formState.isActive,
    }

    if (formState.lastName.trim()) {
      payload.lastName = formState.lastName.trim()
    }

    if (!isEditMode) {
      payload.password = formState.password
    }

    onSubmit(payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>
          {isEditMode ? 'Editar usuario' : 'Nuevo usuario'} · {academyName}
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody className="py-4">
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="user-email">Email *</CFormLabel>
              <CFormInput
                id="user-email"
                type="email"
                value={formState.email}
                onChange={handleChange('email')}
                required
                invalid={Boolean(errors.email)}
                disabled={submitting}
                autoFocus
              />
              {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
            </CCol>

            {!isEditMode && (
              <CCol xs={12} md={6}>
                <CFormLabel htmlFor="user-password">Contraseña *</CFormLabel>
                <CFormInput
                  id="user-password"
                  type="password"
                  value={formState.password}
                  onChange={handleChange('password')}
                  required
                  invalid={Boolean(errors.password)}
                  disabled={submitting}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
              </CCol>
            )}

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="user-firstName">Nombre *</CFormLabel>
              <CFormInput
                id="user-firstName"
                value={formState.firstName}
                onChange={handleChange('firstName')}
                required
                invalid={Boolean(errors.firstName)}
                disabled={submitting}
              />
              {errors.firstName && <div className="invalid-feedback d-block">{errors.firstName}</div>}
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="user-lastName">Apellido</CFormLabel>
              <CFormInput
                id="user-lastName"
                value={formState.lastName}
                onChange={handleChange('lastName')}
                disabled={submitting}
                placeholder="Opcional"
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="user-role">Rol</CFormLabel>
              <CFormSelect
                id="user-role"
                value={formState.role}
                disabled
              >
                <option value="academy">Academia</option>
              </CFormSelect>
              <small className="text-body-secondary">
                Los usuarios de academia solo pueden tener rol "Academia"
              </small>
            </CCol>

            <CCol xs={12} md={6} className="d-flex align-items-center pt-4">
              <CFormCheck
                id="user-isActive"
                label="Usuario activo"
                checked={formState.isActive}
                onChange={handleChange('isActive')}
                disabled={submitting}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting && <CSpinner size="sm" className="me-2" />}
            {isEditMode ? 'Guardar cambios' : 'Crear usuario'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

UserFormModal.propTypes = {
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  visible: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  user: PropTypes.object,
  academyName: PropTypes.string,
}

// ==========================================
// Modal: Reset Password
// ==========================================
const ResetPasswordModal = ({ visible, user, resetting, onClose, onConfirm }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setPassword('')
      setError('')
    }
  }, [visible])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    onConfirm(password)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Resetear contraseña</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          <p className="mb-3">
            Ingresa la nueva contraseña para <strong>{user?.firstName} {user?.lastName}</strong>
          </p>
          <CFormLabel htmlFor="new-password">Nueva contraseña</CFormLabel>
          <CFormInput
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(error)}
            disabled={resetting}
            placeholder="Mínimo 6 caracteres"
            autoFocus
          />
          {error && <div className="invalid-feedback d-block">{error}</div>}
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={resetting}>
            Cancelar
          </CButton>
          <CButton color="warning" type="submit" disabled={resetting}>
            {resetting && <CSpinner size="sm" className="me-2" />}
            Resetear contraseña
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

ResetPasswordModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  user: PropTypes.object,
  resetting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

// ==========================================
// Modal: Delete Confirmation
// ==========================================
const DeleteUserModal = ({ visible, user, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar usuario</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar al usuario <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email}).
        Esta acción es permanente.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" />
        Confirma solo si estás seguro.
      </CAlert>
    </CModalBody>
    <CModalFooter className="bg-body-tertiary justify-content-between">
      <CButton color="secondary" variant="ghost" onClick={onClose} disabled={deleting}>
        Cancelar
      </CButton>
      <CButton color="danger" onClick={onConfirm} disabled={deleting}>
        {deleting && <CSpinner size="sm" className="me-2" />}
        Eliminar definitivamente
      </CButton>
    </CModalFooter>
  </CModal>
)

DeleteUserModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  user: PropTypes.object,
  deleting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

// ==========================================
// Modal: Transfer User
// ==========================================
const TransferUserModal = ({ visible, user, academyId, transferring, onClose, onConfirm }) => {
  const [academies, setAcademies] = useState([])
  const [selectedAcademy, setSelectedAcademy] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setSelectedAcademy('')
      setError('')
      loadAcademies()
    }
  }, [visible])

  const loadAcademies = async () => {
    setLoading(true)
    try {
      const response = await listAcademies()
      // Filtrar la academia actual
      const filtered = (Array.isArray(response) ? response : []).filter(
        (a) => String(a.id) !== String(academyId)
      )
      setAcademies(filtered)
    } catch (err) {
      console.error('Error loading academies', err)
      setError('No se pudieron cargar las academias')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedAcademy) {
      setError('Debes seleccionar una academia')
      return
    }
    onConfirm(selectedAcademy)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Transferir usuario</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          <p className="mb-3">
            Transferir a <strong>{user?.firstName} {user?.lastName}</strong> a otra academia:
          </p>
          {loading ? (
            <div className="d-flex justify-content-center py-3">
              <CSpinner color="primary" />
            </div>
          ) : (
            <>
              <CFormLabel htmlFor="target-academy">Academia destino</CFormLabel>
              <CFormSelect
                id="target-academy"
                value={selectedAcademy}
                onChange={(e) => setSelectedAcademy(e.target.value)}
                invalid={Boolean(error)}
                disabled={transferring}
              >
                <option value="">Selecciona una academia</option>
                {academies.map((academy) => (
                  <option key={academy.id} value={academy.id}>
                    {academy.name}
                  </option>
                ))}
              </CFormSelect>
              {error && <div className="invalid-feedback d-block">{error}</div>}
            </>
          )}
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={transferring}>
            Cancelar
          </CButton>
          <CButton color="info" type="submit" disabled={transferring || loading}>
            {transferring && <CSpinner size="sm" className="me-2" />}
            <CIcon icon={cilArrowRight} className="me-1" />
            Transferir
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

TransferUserModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  user: PropTypes.object,
  academyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  transferring: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

// ==========================================
// Componente: Stats Card
// ==========================================
const StatsCard = ({ stats, loading }) => {
  if (loading) {
    return (
      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-center py-4">
          <CSpinner color="primary" />
        </CCardBody>
      </CCard>
    )
  }

  if (!stats) return null

  return (
    <CCard className="mb-4">
      <CCardBody>
        <div className="d-flex align-items-center mb-3">
          <CIcon icon={cilChart} className="text-primary me-2" size="lg" />
          <h6 className="mb-0">Estadísticas de usuarios</h6>
        </div>
        <CRow className="g-3">
          <CCol xs={6} md={3}>
            <div className="border rounded p-3 text-center">
              <div className="fs-4 fw-bold text-primary">{stats.totalUsers ?? 0}</div>
              <small className="text-body-secondary">Total usuarios</small>
            </div>
          </CCol>
          <CCol xs={6} md={3}>
            <div className="border rounded p-3 text-center">
              <div className="fs-4 fw-bold text-success">{stats.activeUsers ?? 0}</div>
              <small className="text-body-secondary">Activos</small>
            </div>
          </CCol>
          <CCol xs={6} md={3}>
            <div className="border rounded p-3 text-center">
              <div className="fs-4 fw-bold text-danger">{stats.inactiveUsers ?? 0}</div>
              <small className="text-body-secondary">Inactivos</small>
            </div>
          </CCol>
          <CCol xs={6} md={3}>
            <div className="border rounded p-3 text-center">
              <div className="d-flex flex-wrap justify-content-center gap-2">
                {stats.byRole && Object.entries(stats.byRole).map(([role, roleData]) => (
                  <CBadge key={role} color={ROLE_COLORS[role] ?? 'secondary'}>
                    {role}: {typeof roleData === 'object' ? (roleData.total ?? 0) : roleData}
                  </CBadge>
                ))}
              </div>
              <small className="text-body-secondary">Por rol</small>
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

StatsCard.propTypes = {
  stats: PropTypes.object,
  loading: PropTypes.bool,
}

// ==========================================
// Componente Principal: AcademyUsersModal
// ==========================================
const AcademyUsersModal = ({ visible, academy, onClose, isAdmin }) => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // Modal states
  const [formState, setFormState] = useState({ visible: false, mode: 'create', user: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState({ visible: false, user: null })
  const [deleting, setDeleting] = useState(false)
  const [resetState, setResetState] = useState({ visible: false, user: null })
  const [resetting, setResetting] = useState(false)
  const [transferState, setTransferState] = useState({ visible: false, user: null })
  const [transferring, setTransferring] = useState(false)

  const loadUsers = useCallback(async () => {
    if (!academy?.id) return
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
      }
      if (filters.search) params.search = filters.search
      if (filters.role) params.role = filters.role
      if (filters.isActive !== '') params.isActive = filters.isActive === 'true'

      const response = await listAcademyUsers(academy.id, params)
      // La respuesta puede ser un array o un objeto con data
      const usersData = Array.isArray(response) ? response : (response?.data ?? [])
      setUsers(usersData)
    } catch (requestError) {
      console.error('Error loading academy users', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron cargar los usuarios'))
    } finally {
      setLoading(false)
    }
  }, [academy?.id, filters])

  const loadStats = useCallback(async () => {
    if (!academy?.id) return
    setStatsLoading(true)
    try {
      const response = await getAcademyUsersStats(academy.id)
      setStats(response)
    } catch (requestError) {
      console.error('Error loading stats', requestError)
    } finally {
      setStatsLoading(false)
    }
  }, [academy?.id])

  useEffect(() => {
    if (visible && academy?.id) {
      loadUsers()
      loadStats()
    }
  }, [visible, academy, loadUsers, loadStats])

  useEffect(() => {
    if (!feedback) return undefined
    const timeoutId = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timeoutId)
  }, [feedback])

  // Filtrado local si la API no soporta paginación
  const filteredUsers = useMemo(() => {
    return users // Si la API ya filtra, simplemente retornamos
  }, [users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredUsers.slice(start, end)
  }, [filteredUsers, currentPage, filters.limit])

  // Handlers
  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
  }

  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value, page: 1 }))
  }

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  // Form modal handlers
  const openCreate = () => setFormState({ visible: true, mode: 'create', user: null })
  const openEdit = (user) => setFormState({ visible: true, mode: 'edit', user })
  const closeForm = () => {
    if (formSubmitting) return
    setFormState({ visible: false, mode: 'create', user: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      if (formState.mode === 'edit' && formState.user) {
        await updateAcademyUser(academy.id, formState.user.id, payload)
        setFeedback({ type: 'success', message: 'Usuario actualizado correctamente' })
      } else {
        await createAcademyUser(academy.id, payload)
        setFeedback({ type: 'success', message: 'Usuario creado correctamente' })
      }
      setFormState({ visible: false, mode: 'create', user: null })
      await loadUsers()
      await loadStats()
    } catch (requestError) {
      console.error('Error submitting user', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar el usuario') })
    } finally {
      setFormSubmitting(false)
    }
  }

  // Delete handlers
  const openDelete = (user) => setDeleteState({ visible: true, user })
  const closeDelete = () => {
    if (deleting) return
    setDeleteState({ visible: false, user: null })
  }

  const confirmDelete = async () => {
    if (!deleteState.user) return
    setDeleting(true)
    setFeedback(null)
    try {
      await deleteAcademyUser(academy.id, deleteState.user.id)
      setFeedback({ type: 'success', message: 'Usuario eliminado correctamente' })
      setDeleteState({ visible: false, user: null })
      await loadUsers()
      await loadStats()
    } catch (requestError) {
      console.error('Error deleting user', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar el usuario') })
    } finally {
      setDeleting(false)
    }
  }

  // Reset password handlers
  const openReset = (user) => setResetState({ visible: true, user })
  const closeReset = () => {
    if (resetting) return
    setResetState({ visible: false, user: null })
  }

  const confirmReset = async (newPassword) => {
    if (!resetState.user) return
    setResetting(true)
    setFeedback(null)
    try {
      await resetAcademyUserPassword(academy.id, resetState.user.id, { password: newPassword })
      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente' })
      setResetState({ visible: false, user: null })
    } catch (requestError) {
      console.error('Error resetting password', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo resetear la contraseña') })
    } finally {
      setResetting(false)
    }
  }

  // Transfer handlers
  const openTransfer = (user) => setTransferState({ visible: true, user })
  const closeTransfer = () => {
    if (transferring) return
    setTransferState({ visible: false, user: null })
  }

  const confirmTransfer = async (newAcademyId) => {
    if (!transferState.user) return
    setTransferring(true)
    setFeedback(null)
    try {
      await transferAcademyUser(academy.id, transferState.user.id, { newAcademyId })
      setFeedback({ type: 'success', message: 'Usuario transferido correctamente' })
      setTransferState({ visible: false, user: null })
      await loadUsers()
      await loadStats()
    } catch (requestError) {
      console.error('Error transferring user', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo transferir el usuario') })
    } finally {
      setTransferring(false)
    }
  }

  // Toggle active status
  const toggleUserStatus = async (user) => {
    setFeedback(null)
    try {
      if (user.isActive) {
        await deactivateAcademyUser(academy.id, user.id)
        setFeedback({ type: 'success', message: 'Usuario desactivado' })
      } else {
        await activateAcademyUser(academy.id, user.id)
        setFeedback({ type: 'success', message: 'Usuario activado' })
      }
      await loadUsers()
      await loadStats()
    } catch (requestError) {
      console.error('Error toggling status', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo cambiar el estado') })
    }
  }

  if (!visible) return null

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="xl" backdrop="static" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>
          <CIcon icon={cilUser} className="me-2" />
          Usuarios de: {academy?.name}
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="py-4">
        {feedback && (
          <CAlert color={feedback.type} className="mb-4" dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}

        {error && <CAlert color="danger" className="mb-4">{error}</CAlert>}

        {/* Stats */}
        <StatsCard stats={stats} loading={statsLoading} />

        {/* Filters */}
        <CRow className="g-3 mb-4">
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="users-search">Buscar</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilList} />
              </CInputGroupText>
              <CFormInput
                id="users-search"
                placeholder="Buscar por nombre o email"
                value={filters.search}
                onChange={handleSearchChange}
                disabled={loading}
              />
            </CInputGroup>
          </CCol>
          <CCol xs={6} md={2}>
            <CFormLabel htmlFor="users-status">Estado</CFormLabel>
            <CFormSelect
              id="users-status"
              value={filters.isActive}
              onChange={handleFilterChange('isActive')}
              disabled={loading}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={2}>
            <CFormLabel htmlFor="users-limit">Por página</CFormLabel>
            <CFormSelect
              id="users-limit"
              value={filters.limit}
              onChange={handleFilterChange('limit')}
              disabled={loading}
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={2} className="d-flex align-items-end gap-2">
            <CButton color="secondary" variant="ghost" onClick={loadUsers} disabled={loading}>
              <CIcon icon={cilReload} />
            </CButton>
            {isAdmin && (
              <CButton color="primary" onClick={openCreate} disabled={loading}>
                <CIcon icon={cilPlus} className="me-1" /> Nuevo
              </CButton>
            )}
          </CCol>
        </CRow>

        {/* Table */}
        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <>
            <CTable responsive="md" hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Usuario</CTableHeaderCell>
                  <CTableHeaderCell>Rol</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Fechas</CTableHeaderCell>
                  {isAdmin && <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedUsers.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={isAdmin ? 5 : 4} className="text-center py-4 text-body-secondary">
                      No se encontraron usuarios.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedUsers.map((user) => (
                  <CTableRow key={user.id}>
                    <CTableDataCell>
                      <div className="d-flex align-items-center gap-2">
                        <CIcon icon={cilUser} className="text-primary" />
                        <div>
                          <div className="fw-semibold">{user.firstName} {user.lastName}</div>
                          <div className="text-body-secondary small">{user.email}</div>
                        </div>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="primary">
                        Academia
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {user.isActive ? (
                        <CBadge color="success">Activo</CBadge>
                      ) : (
                        <CBadge color="danger">Inactivo</CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-column gap-1">
                        <span className="small text-body-secondary d-flex align-items-center gap-1">
                          <CIcon icon={cilCalendar} size="sm" /> Creado: {formatDate(user.createdAt)}
                        </span>
                        <span className="small text-body-secondary d-flex align-items-center gap-1">
                          <CIcon icon={cilCheckCircle} size="sm" /> Actualizado: {formatDate(user.updatedAt)}
                        </span>
                      </div>
                    </CTableDataCell>
                    {isAdmin && (
                      <CTableDataCell className="text-end">
                        <CButtonGroup size="sm">
                          <CButton
                            color="secondary"
                            variant="ghost"
                            title="Editar"
                            onClick={() => openEdit(user)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color={user.isActive ? 'warning' : 'success'}
                            variant="ghost"
                            title={user.isActive ? 'Desactivar' : 'Activar'}
                            onClick={() => toggleUserStatus(user)}
                          >
                            <CIcon icon={user.isActive ? cilBan : cilCheckCircle} />
                          </CButton>
                          <CButton
                            color="info"
                            variant="ghost"
                            title="Resetear contraseña"
                            onClick={() => openReset(user)}
                          >
                            <CIcon icon={cilLockLocked} />
                          </CButton>
                          <CButton
                            color="primary"
                            variant="ghost"
                            title="Transferir"
                            onClick={() => openTransfer(user)}
                          >
                            <CIcon icon={cilArrowRight} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            title="Eliminar"
                            onClick={() => openDelete(user)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CButtonGroup>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {filteredUsers.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  >
                    Anterior
                  </CPaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <CPaginationItem
                      key={p}
                      active={p === currentPage}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  >
                    Siguiente
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </>
        )}
      </CModalBody>
      <CModalFooter className="bg-body-tertiary">
        <CButton color="secondary" variant="ghost" onClick={onClose}>
          Cerrar
        </CButton>
      </CModalFooter>

      {/* Sub-modals */}
      <UserFormModal
        mode={formState.mode}
        visible={formState.visible}
        submitting={formSubmitting}
        onClose={closeForm}
        onSubmit={submitForm}
        user={formState.user}
        academyName={academy?.name}
      />

      <DeleteUserModal
        visible={deleteState.visible}
        user={deleteState.user}
        deleting={deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />

      <ResetPasswordModal
        visible={resetState.visible}
        user={resetState.user}
        resetting={resetting}
        onClose={closeReset}
        onConfirm={confirmReset}
      />

      <TransferUserModal
        visible={transferState.visible}
        user={transferState.user}
        academyId={academy?.id}
        transferring={transferring}
        onClose={closeTransfer}
        onConfirm={confirmTransfer}
      />
    </CModal>
  )
}

AcademyUsersModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  academy: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
}

export default AcademyUsersModal
