import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
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
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPencil,
  cilPlus,
  cilReload,
  cilSearch,
  cilTrash,
  cilUser,
  cilWarning,
} from '@coreui/icons'

import { useAuth } from '../../hooks/useAuth'
import {
  listCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
} from '../../services/coachesApi'
import { HttpError } from '../../services/httpClient'

const getErrorMessage = (error, fallback = 'Ocurrió un error inesperado') => {
  if (!error) return fallback
  if (error instanceof HttpError) {
    const { data, message } = error
    if (Array.isArray(data?.message)) return data.message.join('. ')
    return data?.message ?? message ?? fallback
  }
  if (typeof error === 'string') return error
  return error.message ?? fallback
}

const INITIAL_FORM_DATA = {
  name: '',
  mail: '',
  phone: '',
}

const AcademyCoaches = () => {
  const { user } = useAuth()
  const academyId = user?.academyId

  // Estados de datos
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados de paginación y búsqueda
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Estados del modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Estados de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [coachToDelete, setCoachToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Cargar coaches
  const loadCoaches = useCallback(async () => {
    if (!academyId) {
      setError('No se encontró la academia asociada a tu cuenta')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await listCoaches({
        academyId,
        page,
        limit,
        search: search || undefined,
      })

      const data = response?.data || response || []
      setCoaches(Array.isArray(data) ? data : data.items || [])
      setTotal(response?.total || response?.meta?.total || data.length || 0)
    } catch (err) {
      console.error('Error loading coaches:', err)
      setError(getErrorMessage(err, 'Error al cargar los coaches'))
    } finally {
      setLoading(false)
    }
  }, [academyId, page, limit, search])

  useEffect(() => {
    loadCoaches()
  }, [loadCoaches])

  // Manejar búsqueda
  const handleSearch = useCallback((e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  // Limpiar búsqueda
  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }, [])

  // Validar formulario
  const validateForm = useCallback(() => {
    const errors = {}

    if (!formData.name?.trim()) {
      errors.name = 'El nombre es requerido'
    }

    if (!formData.mail?.trim()) {
      errors.mail = 'El correo es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mail)) {
      errors.mail = 'El correo no es válido'
    }

    if (!formData.phone?.trim()) {
      errors.phone = 'El teléfono es requerido'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  // Abrir modal para crear
  const handleOpenCreateModal = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setFormErrors({})
    setSubmitError(null)
    setSelectedCoach(null)
    setModalMode('create')
    setShowModal(true)
  }, [])

  // Abrir modal para editar
  const handleOpenEditModal = useCallback((coach) => {
    setSelectedCoach(coach)
    setFormData({
      name: coach.name || '',
      mail: coach.mail || coach.email || '',
      phone: coach.phone || '',
    })
    setFormErrors({})
    setSubmitError(null)
    setModalMode('edit')
    setShowModal(true)
  }, [])

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedCoach(null)
    setFormData(INITIAL_FORM_DATA)
    setFormErrors({})
    setSubmitError(null)
  }, [])

  // Manejar cambios en formulario
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Limpiar error del campo al escribir
    setFormErrors((prev) => ({ ...prev, [name]: null }))
    setSubmitError(null)
  }, [])

  // Guardar coach
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      if (modalMode === 'create') {
        await createCoach({
          ...formData,
          academyIds: [academyId],
        })
      } else {
        await updateCoach(selectedCoach.id, formData)
      }

      handleCloseModal()
      loadCoaches()
    } catch (err) {
      setSubmitError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir modal de eliminación
  const handleOpenDeleteModal = useCallback((coach) => {
    setCoachToDelete(coach)
    setShowDeleteModal(true)
  }, [])

  // Cerrar modal de eliminación
  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false)
    setCoachToDelete(null)
  }, [])

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!coachToDelete) return

    setDeleting(true)
    try {
      await deleteCoach(coachToDelete.id)
      handleCloseDeleteModal()
      loadCoaches()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al eliminar el coach'))
    } finally {
      setDeleting(false)
    }
  }

  // Calcular páginas
  const totalPages = Math.ceil(total / limit)

  // Renderizar paginación
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <CPaginationItem
          key={i}
          active={i === page}
          onClick={() => setPage(i)}
        >
          {i}
        </CPaginationItem>
      )
    }

    return (
      <CPagination className="justify-content-center mt-3">
        <CPaginationItem
          disabled={page === 1}
          onClick={() => setPage(1)}
        >
          «
        </CPaginationItem>
        <CPaginationItem
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          ‹
        </CPaginationItem>
        {pages}
        <CPaginationItem
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          ›
        </CPaginationItem>
        <CPaginationItem
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
        >
          »
        </CPaginationItem>
      </CPagination>
    )
  }

  if (!academyId) {
    return (
      <CAlert color="danger">
        No se encontró la academia asociada a tu cuenta. Por favor, contacta al administrador.
      </CAlert>
    )
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <CIcon icon={cilUser} className="me-2" />
            <strong>Coaches de mi Academia</strong>
            {total > 0 && (
              <CBadge color="primary" className="ms-2">{total}</CBadge>
            )}
          </div>
          <div className="d-flex gap-2">
            <CButton
              color="primary"
              size="sm"
              onClick={handleOpenCreateModal}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Agregar Coach
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={loadCoaches}
              disabled={loading}
            >
              <CIcon icon={cilReload} />
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          {/* Barra de búsqueda */}
          <CForm onSubmit={handleSearch} className="mb-4">
            <CRow className="g-2 align-items-end">
              <CCol md={6} lg={4}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              <CCol xs="auto">
                <CButton type="submit" color="primary">
                  Buscar
                </CButton>
              </CCol>
              {search && (
                <CCol xs="auto">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={handleClearSearch}
                  >
                    Limpiar
                  </CButton>
                </CCol>
              )}
            </CRow>
          </CForm>

          {/* Mensajes de error */}
          {error && (
            <CAlert color="danger" dismissible onClose={() => setError(null)}>
              <CIcon icon={cilWarning} className="me-2" />
              {error}
            </CAlert>
          )}

          {/* Tabla de coaches */}
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-2 text-body-secondary">Cargando coaches...</p>
            </div>
          ) : coaches.length === 0 ? (
            <div className="text-center py-5 text-body-secondary">
              <CIcon icon={cilUser} size="3xl" className="mb-3 opacity-50" />
              <p>No hay coaches registrados</p>
              {search && (
                <p className="small">
                  No se encontraron resultados para &quot;{search}&quot;
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <CTable hover align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Nombre</CTableHeaderCell>
                      <CTableHeaderCell>Correo Electrónico</CTableHeaderCell>
                      <CTableHeaderCell>Teléfono</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {coaches.map((coach) => (
                      <CTableRow key={coach.id}>
                        <CTableDataCell>
                          <strong>{coach.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {coach.mail || coach.email || '—'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {coach.phone || '—'}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CTooltip content="Editar">
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(coach)}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          </CTooltip>
                          <CTooltip content="Eliminar">
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(coach)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTooltip>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>

              {/* Paginación */}
              {renderPagination()}

              {/* Info de resultados */}
              <div className="text-center text-body-secondary small mt-2">
                Mostrando {coaches.length} de {total} coaches
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Modal de Crear/Editar */}
      <CModal visible={showModal} onClose={handleCloseModal}>
        <CModalHeader>
          <CModalTitle>
            {modalMode === 'create' ? 'Agregar Coach' : 'Editar Coach'}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            {submitError && (
              <CAlert color="danger" className="d-flex align-items-center">
                <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
                {submitError}
              </CAlert>
            )}

            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel htmlFor="name">Nombre Completo *</CFormLabel>
                <CFormInput
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  invalid={!!formErrors.name}
                  placeholder="Nombre completo del coach"
                />
                {formErrors.name && (
                  <div className="invalid-feedback d-block">{formErrors.name}</div>
                )}
              </CCol>

              <CCol md={12}>
                <CFormLabel htmlFor="mail">Correo Electrónico *</CFormLabel>
                <CFormInput
                  id="mail"
                  name="mail"
                  type="email"
                  value={formData.mail}
                  onChange={handleInputChange}
                  invalid={!!formErrors.mail}
                  placeholder="correo@ejemplo.com"
                />
                {formErrors.mail && (
                  <div className="invalid-feedback d-block">{formErrors.mail}</div>
                )}
              </CCol>

              <CCol md={12}>
                <CFormLabel htmlFor="phone">Teléfono *</CFormLabel>
                <CFormInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  invalid={!!formErrors.phone}
                  placeholder="10 dígitos"
                />
                {formErrors.phone && (
                  <div className="invalid-feedback d-block">{formErrors.phone}</div>
                )}
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={handleCloseModal}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              {modalMode === 'create' ? 'Agregar' : 'Guardar Cambios'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal de Confirmación de Eliminación */}
      <CModal visible={showDeleteModal} onClose={handleCloseDeleteModal}>
        <CModalHeader>
          <CModalTitle>Confirmar Eliminación</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            ¿Estás seguro de que deseas eliminar al coach{' '}
            <strong>{coachToDelete?.name}</strong>?
          </p>
          <CAlert color="warning" className="mb-0">
            <CIcon icon={cilWarning} className="me-2" />
            Esta acción no se puede deshacer.
          </CAlert>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseDeleteModal}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting && <CSpinner size="sm" className="me-2" />}
            Eliminar
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AcademyCoaches
