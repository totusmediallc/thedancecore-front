import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  cilCheckCircle,
  cilInfo,
} from '@coreui/icons'

import { useAuth } from '../../hooks/useAuth'
import {
  listDancers,
  createOrLinkDancer,
  updateDancer,
  deleteDancer,
} from '../../services/dancersApi'
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

// Formatear fecha para mostrar
const formatDate = (dateString) => {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

// Calcular edad
const calculateAge = (birthDate) => {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Validar CURP
const validateCURP = (curp) => {
  if (!curp) return false
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
  return curpRegex.test(curp.toUpperCase())
}

const INITIAL_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  curp: '',
}

const AcademyDancers = () => {
  const { user } = useAuth()
  const academyId = user?.academyId

  // Estados de datos
  const [dancers, setDancers] = useState([])
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
  const [selectedDancer, setSelectedDancer] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [wasLinked, setWasLinked] = useState(false)

  // Estados de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dancerToDelete, setDancerToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Cargar bailarines
  const loadDancers = useCallback(async () => {
    if (!academyId) {
      setError('No se encontró la academia asociada a tu cuenta')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await listDancers({
        academyId,
        page,
        limit,
        search: search || undefined,
      })

      const data = response?.data || response || []
      setDancers(Array.isArray(data) ? data : data.items || [])
      setTotal(response?.total || response?.meta?.total || data.length || 0)
    } catch (err) {
      console.error('Error loading dancers:', err)
      setError(getErrorMessage(err, 'Error al cargar los bailarines'))
    } finally {
      setLoading(false)
    }
  }, [academyId, page, limit, search])

  useEffect(() => {
    loadDancers()
  }, [loadDancers])

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

    if (!formData.birthDate) {
      errors.birthDate = 'La fecha de nacimiento es requerida'
    }

    if (!formData.curp?.trim()) {
      errors.curp = 'El CURP es requerido'
    } else if (!validateCURP(formData.curp)) {
      errors.curp = 'El CURP no tiene un formato válido'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El email no es válido'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  // Abrir modal para crear
  const handleOpenCreateModal = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setFormErrors({})
    setSubmitError(null)
    setWasLinked(false)
    setSelectedDancer(null)
    setModalMode('create')
    setShowModal(true)
  }, [])

  // Abrir modal para editar
  const handleOpenEditModal = useCallback((dancer) => {
    setSelectedDancer(dancer)
    setFormData({
      name: dancer.name || '',
      email: dancer.email || '',
      phone: dancer.phone || '',
      birthDate: dancer.birthDate ? dancer.birthDate.split('T')[0] : '',
      curp: dancer.curp || '',
    })
    setFormErrors({})
    setSubmitError(null)
    setWasLinked(false)
    setModalMode('edit')
    setShowModal(true)
  }, [])

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedDancer(null)
    setFormData(INITIAL_FORM_DATA)
    setFormErrors({})
    setSubmitError(null)
    setWasLinked(false)
  }, [])

  // Manejar cambios en formulario
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'curp' ? value.toUpperCase() : value,
    }))
    // Limpiar error del campo al escribir
    setFormErrors((prev) => ({ ...prev, [name]: null }))
    setSubmitError(null)
  }, [])

  // Guardar bailarín
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)
    setSubmitError(null)
    setWasLinked(false)

    try {
      if (modalMode === 'create') {
        const response = await createOrLinkDancer({
          ...formData,
          academyIds: [academyId],
        })
        // Verificar si fue vinculado o creado
        if (response?.wasLinked) {
          setWasLinked(true)
        }
      } else {
        await updateDancer(selectedDancer.id, formData)
      }

      handleCloseModal()
      loadDancers()
    } catch (err) {
      setSubmitError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir modal de eliminación
  const handleOpenDeleteModal = useCallback((dancer) => {
    setDancerToDelete(dancer)
    setShowDeleteModal(true)
  }, [])

  // Cerrar modal de eliminación
  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false)
    setDancerToDelete(null)
  }, [])

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!dancerToDelete) return

    setDeleting(true)
    try {
      await deleteDancer(dancerToDelete.id)
      handleCloseDeleteModal()
      loadDancers()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al eliminar el bailarín'))
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
            <strong>Bailarines de mi Academia</strong>
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
              Agregar Bailarín
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={loadDancers}
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
                    placeholder="Buscar por nombre, email o CURP..."
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

          {/* Tabla de bailarines */}
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-2 text-body-secondary">Cargando bailarines...</p>
            </div>
          ) : dancers.length === 0 ? (
            <div className="text-center py-5 text-body-secondary">
              <CIcon icon={cilUser} size="3xl" className="mb-3 opacity-50" />
              <p>No hay bailarines registrados</p>
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
                      <CTableHeaderCell>CURP</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Edad</CTableHeaderCell>
                      <CTableHeaderCell>Fecha Nacimiento</CTableHeaderCell>
                      <CTableHeaderCell>Contacto</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {dancers.map((dancer) => (
                      <CTableRow key={dancer.id}>
                        <CTableDataCell>
                          <strong>{dancer.name}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <code className="small">{dancer.curp}</code>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          {calculateAge(dancer.birthDate) !== null ? (
                            <CBadge color="info">{calculateAge(dancer.birthDate)} años</CBadge>
                          ) : (
                            '—'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {formatDate(dancer.birthDate)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="small">
                            {dancer.email && <div>{dancer.email}</div>}
                            {dancer.phone && <div className="text-body-secondary">{dancer.phone}</div>}
                            {!dancer.email && !dancer.phone && '—'}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CTooltip content="Editar">
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(dancer)}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          </CTooltip>
                          <CTooltip content="Eliminar">
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDeleteModal(dancer)}
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
                Mostrando {dancers.length} de {total} bailarines
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Modal de Crear/Editar */}
      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            {modalMode === 'create' ? 'Agregar Bailarín' : 'Editar Bailarín'}
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

            {wasLinked && (
              <CAlert color="info" className="d-flex align-items-center">
                <CIcon icon={cilInfo} className="flex-shrink-0 me-2" />
                Este bailarín ya existía en el sistema y ha sido vinculado a tu academia.
              </CAlert>
            )}

            {modalMode === 'create' && (
              <CAlert color="info" className="d-flex align-items-start mb-4">
                <CIcon icon={cilInfo} className="flex-shrink-0 me-2 mt-1" />
                <div>
                  <strong>Nota:</strong> Si el CURP ya está registrado en el sistema, 
                  el bailarín será vinculado automáticamente a tu academia.
                </div>
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
                  placeholder="Nombre completo del bailarín"
                />
                {formErrors.name && (
                  <div className="invalid-feedback d-block">{formErrors.name}</div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="curp">CURP *</CFormLabel>
                <CFormInput
                  id="curp"
                  name="curp"
                  value={formData.curp}
                  onChange={handleInputChange}
                  invalid={!!formErrors.curp}
                  placeholder="XXXX000000XXXXXX00"
                  maxLength={18}
                  disabled={modalMode === 'edit'}
                />
                {formErrors.curp && (
                  <div className="invalid-feedback d-block">{formErrors.curp}</div>
                )}
                {modalMode === 'edit' && (
                  <div className="form-text">El CURP no puede ser modificado</div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="birthDate">Fecha de Nacimiento *</CFormLabel>
                <CFormInput
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  invalid={!!formErrors.birthDate}
                />
                {formErrors.birthDate && (
                  <div className="invalid-feedback d-block">{formErrors.birthDate}</div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="email">Correo Electrónico</CFormLabel>
                <CFormInput
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  invalid={!!formErrors.email}
                  placeholder="correo@ejemplo.com"
                />
                {formErrors.email && (
                  <div className="invalid-feedback d-block">{formErrors.email}</div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="phone">Teléfono</CFormLabel>
                <CFormInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10 dígitos"
                />
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
            ¿Estás seguro de que deseas eliminar al bailarín{' '}
            <strong>{dancerToDelete?.name}</strong>?
          </p>
          <CAlert color="warning" className="mb-0">
            <CIcon icon={cilWarning} className="me-2" />
            Esta acción no se puede deshacer. El bailarín será desvinculado de tu academia.
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

export default AcademyDancers
