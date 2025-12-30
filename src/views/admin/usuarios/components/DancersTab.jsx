import React, { useCallback, useEffect, useMemo, useState } from 'react'

import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilEnvelopeClosed,
  cilList,
  cilPencil,
  cilPhone,
  cilPlus,
  cilReload,
  cilTrash,
  cilUser,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
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

import { usePermissions } from '../../../../hooks/usePermissions'
import { HttpError } from '../../../../services/httpClient'
import {
  createDancer,
  deleteDancer,
  listDancers,
  updateDancer,
} from '../../../../services/dancersApi'
import { PERMISSIONS } from '../../../../config/permissions'
import PermissionGate from '../../../../components/PermissionGate'

const DEFAULT_FILTERS = {
  search: '',
  academyId: '',
  page: 1,
  limit: 10,
}

const LIMIT_OPTIONS = [10, 20, 50, 100]

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

const formatDate = (value, options = { dateStyle: 'medium' }) => {
  if (!value) {
    return '—'
  }

  try {
    const date = typeof value === 'string' ? new Date(value) : value
    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat('es-AR', options).format(date)
  } catch (error) {
    console.error('Unable to format date', error)
    return '—'
  }
}

const calculateAge = (birthDate) => {
  if (!birthDate) return null

  const today = new Date()
  const birth = new Date(birthDate)

  if (Number.isNaN(birth.getTime())) return null

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

const getErrorMessage = (error, fallback = 'Ocurrió un error inesperado') => {
  if (!error) {
    return fallback
  }

  if (error instanceof HttpError) {
    const { data, message } = error
    if (Array.isArray(data?.message)) {
      return data.message.join('. ')
    }
    return data?.message ?? message ?? fallback
  }

  if (typeof error === 'string') {
    return error
  }

  return error.message ?? fallback
}

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  curp: '',
  academyIds: [],
}

const DancerFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  dancer,
  academies = [],
}) => {
  const isEditMode = mode === 'edit'

  // Estado inicial calculado una vez al montar (el componente se remonta via key cuando cambia visible/dancer)
  const getInitialState = () =>
    isEditMode && dancer
      ? {
          name: dancer.name ?? '',
          email: dancer.email ?? '',
          phone: dancer.phone ?? '',
          birthDate: dancer.birthDate ? dancer.birthDate.split('T')[0] : '',
          curp: dancer.curp ?? '',
          academyIds: dancer.academies?.map((a) => a.id) ?? [],
        }
      : initialFormState

  const [formState, setFormState] = useState(getInitialState)
  const [errors, setErrors] = useState({})

  const handleChange = (field) => (event) => {
    let value = event.target.value

    // CURP siempre en mayúsculas
    if (field === 'curp') {
      value = value.toUpperCase()
    }

    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleAcademyChange = (event) => {
    const selectedOptions = Array.from(event.target.selectedOptions, (option) => option.value)
    setFormState((prev) => ({ ...prev, academyIds: selectedOptions }))
  }

  const toggleAcademy = (academyId) => {
    setFormState((prev) => {
      const exists = prev.academyIds.includes(academyId)
      const newIds = exists
        ? prev.academyIds.filter((id) => id !== academyId)
        : [...prev.academyIds, academyId]
      return { ...prev, academyIds: newIds }
    })
  }

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.name.trim()) {
      validationErrors.name = 'El nombre es obligatorio'
    }

    if (formState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
      validationErrors.email = 'El correo no tiene un formato válido'
    }

    if (!formState.birthDate) {
      validationErrors.birthDate = 'La fecha de nacimiento es obligatoria'
    } else {
      const birthDate = new Date(formState.birthDate)
      const today = new Date()
      if (birthDate >= today) {
        validationErrors.birthDate = 'La fecha de nacimiento debe ser anterior a hoy'
      }
    }

    if (!formState.curp.trim()) {
      validationErrors.curp = 'El CURP es obligatorio'
    } else if (!CURP_REGEX.test(formState.curp.trim())) {
      validationErrors.curp = 'El CURP no tiene un formato válido'
    }

    if (formState.academyIds.length === 0) {
      validationErrors.academyIds = 'Debes seleccionar al menos una academia'
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [formState])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    const payload = {
      name: formState.name.trim(),
      birthDate: formState.birthDate,
      curp: formState.curp.trim().toUpperCase(),
      academyIds: formState.academyIds,
    }

    if (formState.email?.trim()) {
      payload.email = formState.email.trim().toLowerCase()
    }

    if (formState.phone?.trim()) {
      payload.phone = formState.phone.trim()
    }

    onSubmit(payload)
  }

  const title = isEditMode ? 'Editar bailarín' : 'Nuevo bailarín'

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
              <CFormLabel htmlFor="dancer-name">Nombre completo *</CFormLabel>
              <CFormInput
                id="dancer-name"
                value={formState.name}
                onChange={handleChange('name')}
                disabled={submitting}
                invalid={Boolean(errors.name)}
                autoFocus
                placeholder="Nombre completo del bailarín"
              />
              {errors.name ? <div className="invalid-feedback d-block">{errors.name}</div> : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="dancer-curp">CURP *</CFormLabel>
              <CFormInput
                id="dancer-curp"
                value={formState.curp}
                onChange={handleChange('curp')}
                disabled={submitting}
                invalid={Boolean(errors.curp)}
                placeholder="CURP único"
                maxLength={18}
                style={{ textTransform: 'uppercase' }}
              />
              {errors.curp ? (
                <div className="invalid-feedback d-block">{errors.curp}</div>
              ) : (
                <small className="text-body-secondary">18 caracteres alfanuméricos</small>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="dancer-email">Correo electrónico</CFormLabel>
              <CFormInput
                id="dancer-email"
                type="email"
                value={formState.email}
                onChange={handleChange('email')}
                disabled={submitting}
                invalid={Boolean(errors.email)}
                placeholder="correo@ejemplo.com (opcional)"
              />
              {errors.email ? <div className="invalid-feedback d-block">{errors.email}</div> : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="dancer-phone">Teléfono</CFormLabel>
              <CFormInput
                id="dancer-phone"
                type="tel"
                value={formState.phone}
                onChange={handleChange('phone')}
                disabled={submitting}
                placeholder="Teléfono de contacto (opcional)"
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="dancer-birth-date">Fecha de nacimiento *</CFormLabel>
              <CFormInput
                id="dancer-birth-date"
                type="date"
                value={formState.birthDate}
                onChange={handleChange('birthDate')}
                disabled={submitting}
                invalid={Boolean(errors.birthDate)}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.birthDate ? (
                <div className="invalid-feedback d-block">{errors.birthDate}</div>
              ) : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel>Academias asociadas *</CFormLabel>
              <div
                className={`border rounded p-2 ${errors.academyIds ? 'border-danger' : ''}`}
                style={{ maxHeight: '150px', overflowY: 'auto' }}
              >
                {academies.length === 0 ? (
                  <p className="text-body-secondary mb-0 small">No hay academias disponibles</p>
                ) : (
                  academies.map((academy) => (
                    <div key={academy.id} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`academy-${academy.id}`}
                        checked={formState.academyIds.includes(academy.id)}
                        onChange={() => toggleAcademy(academy.id)}
                        disabled={submitting}
                      />
                      <label className="form-check-label" htmlFor={`academy-${academy.id}`}>
                        {academy.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {errors.academyIds ? (
                <div className="invalid-feedback d-block">{errors.academyIds}</div>
              ) : (
                <small className="text-body-secondary">Selecciona una o más academias</small>
              )}
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
              'Guardar'
            )}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const DeleteDancerModal = ({ visible, onClose, onConfirm, dancer, submitting }) => (
  <CModal
    alignment="center"
    visible={visible}
    onClose={submitting ? undefined : onClose}
    backdrop="static"
  >
    <CModalHeader closeButton={!submitting}>
      <CModalTitle>Eliminar bailarín</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        ¿Estás seguro de que deseas eliminar a <strong>{dancer?.name}</strong>?
      </p>
      <p className="text-body-secondary mb-0">
        Esta acción eliminará al bailarín y todas sus asignaciones a coreografías. Esta acción no se
        puede deshacer.
      </p>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="ghost" disabled={submitting} onClick={onClose}>
        Cancelar
      </CButton>
      <CButton color="danger" disabled={submitting} onClick={onConfirm}>
        {submitting ? (
          <>
            <CSpinner size="sm" className="me-2" /> Eliminando...
          </>
        ) : (
          'Eliminar'
        )}
      </CButton>
    </CModalFooter>
  </CModal>
)

const DancersTab = ({ academies = [] }) => {
  const { hasPermission } = usePermissions()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [dancers, setDancers] = useState([])
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
  const [editModalState, setEditModalState] = useState({ visible: false, dancer: null })
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState({
    visible: false,
    dancer: null,
    submitting: false,
  })

  const canRead = hasPermission(PERMISSIONS.DANCERS_READ)
  const canCreate = hasPermission(PERMISSIONS.DANCERS_CREATE)
  const canUpdate = hasPermission(PERMISSIONS.DANCERS_UPDATE)
  const canDelete = hasPermission(PERMISSIONS.DANCERS_DELETE)

  const normalizedFilters = useMemo(() => {
    return {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      academyId: filters.academyId || undefined,
    }
  }, [filters])

  const loadDancers = useCallback(async () => {
    if (!canRead) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await listDancers(normalizedFilters)
      // El backend puede devolver array directo o { data, meta }
      const data = Array.isArray(response) ? response : response?.data
      setDancers(Array.isArray(data) ? data : [])

      const responseMeta = response?.meta ?? {}
      setMeta({
        page: responseMeta.page ?? filters.page,
        limit: responseMeta.limit ?? filters.limit,
        totalPages: Math.max(responseMeta.totalPages ?? 1, 1),
        total: responseMeta.total ?? (Array.isArray(data) ? data.length : 0),
      })
    } catch (requestError) {
      console.error('Unable to load dancers', requestError)
      setError(getErrorMessage(requestError, 'No fue posible cargar los bailarines'))
      setDancers([])
    } finally {
      setIsLoading(false)
    }
  }, [filters.limit, filters.page, canRead, normalizedFilters])

  useEffect(() => {
    loadDancers()
  }, [loadDancers])

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

  const handleAcademyFilterChange = (event) => {
    setFilters((prev) => ({ ...prev, academyId: event.target.value, page: 1 }))
  }

  const handleRefresh = () => {
    loadDancers()
  }

  const handleCreateSubmit = async (payload) => {
    setActionSubmitting(true)
    setFeedback(null)
    try {
      await createDancer(payload)
      setCreateModalOpen(false)
      setFeedback({ type: 'success', message: 'Bailarín creado correctamente' })
      await loadDancers()
      if (filters.page !== 1) {
        resetToFirstPage()
      }
    } catch (requestError) {
      console.error('Create dancer failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo crear el bailarín'),
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleEditSubmit = async (payload) => {
    if (!editModalState.dancer) {
      return
    }

    setActionSubmitting(true)
    setFeedback(null)
    try {
      await updateDancer(editModalState.dancer.id, payload)
      setEditModalState({ visible: false, dancer: null })
      setFeedback({ type: 'success', message: 'Bailarín actualizado correctamente' })
      await loadDancers()
    } catch (requestError) {
      console.error('Update dancer failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo actualizar el bailarín'),
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteState.dancer) {
      return
    }

    setDeleteState((prev) => ({ ...prev, submitting: true }))
    setFeedback(null)
    try {
      await deleteDancer(deleteState.dancer.id)
      setDeleteState({ visible: false, dancer: null, submitting: false })
      setFeedback({ type: 'success', message: 'Bailarín eliminado correctamente' })
      await loadDancers()
    } catch (requestError) {
      console.error('Delete dancer failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo eliminar el bailarín'),
      })
      setDeleteState((prev) => ({ ...prev, submitting: false }))
    }
  }

  if (!canRead) {
    return (
      <CAlert color="warning" className="mt-4">
        No tienes permisos para ver bailarines.
      </CAlert>
    )
  }

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <CButton color="secondary" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <CIcon icon={cilReload} className="me-2" /> Actualizar
        </CButton>
        <PermissionGate permission={PERMISSIONS.DANCERS_CREATE}>
          <CButton color="primary" onClick={() => setCreateModalOpen(true)}>
            <CIcon icon={cilPlus} className="me-2" /> Nuevo bailarín
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
              placeholder="Buscar por nombre, email o CURP"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <CButton color="primary" type="submit" disabled={isLoading}>
              <CIcon icon={cilList} className="me-2" /> Buscar
            </CButton>
          </CForm>
        </CCol>
        <CCol xs={12} sm={4} lg={3}>
          <CFormLabel className="small text-uppercase fw-semibold text-body-secondary">
            Academia
          </CFormLabel>
          <CFormSelect
            value={filters.academyId}
            onChange={handleAcademyFilterChange}
            disabled={isLoading}
          >
            <option value="">Todas las academias</option>
            {academies.map((academy) => (
              <option key={academy.id} value={academy.id}>
                {academy.name}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} sm={4} lg={2}>
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
        </CCol>
        <CCol xs={12} sm={4} lg={3} className="d-flex align-items-end">
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
              <CTableHeaderCell>CURP</CTableHeaderCell>
              <CTableHeaderCell>Contacto</CTableHeaderCell>
              <CTableHeaderCell>Fecha de nacimiento</CTableHeaderCell>
              <CTableHeaderCell>Edad</CTableHeaderCell>
              <CTableHeaderCell>Academias</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {isLoading ? (
              <CTableRow>
                <CTableDataCell colSpan={7} className="text-center py-4">
                  <CSpinner size="sm" className="me-2" /> Cargando bailarines...
                </CTableDataCell>
              </CTableRow>
            ) : dancers.length === 0 ? (
              <CTableRow>
                <CTableDataCell colSpan={7} className="text-center py-4 text-body-secondary">
                  No se encontraron bailarines con los filtros actuales.
                </CTableDataCell>
              </CTableRow>
            ) : (
              dancers.map((dancer) => {
                const age = calculateAge(dancer.birthDate)
                return (
                  <CTableRow key={dancer.id} className="align-middle">
                    <CTableDataCell>
                      <div className="fw-semibold text-body">
                        <CIcon icon={cilUser} className="me-2 text-body-secondary" />
                        {dancer.name}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <code className="text-body-secondary">{dancer.curp}</code>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="small">
                        {dancer.email ? (
                          <div>
                            <CIcon
                              icon={cilEnvelopeClosed}
                              size="sm"
                              className="me-1 text-body-secondary"
                            />
                            {dancer.email}
                          </div>
                        ) : null}
                        {dancer.phone ? (
                          <div>
                            <CIcon icon={cilPhone} size="sm" className="me-1 text-body-secondary" />
                            {dancer.phone}
                          </div>
                        ) : null}
                        {!dancer.email && !dancer.phone ? (
                          <span className="text-body-secondary">—</span>
                        ) : null}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CIcon icon={cilCalendar} size="sm" className="me-1 text-body-secondary" />
                      {formatDate(dancer.birthDate)}
                    </CTableDataCell>
                    <CTableDataCell>
                      {age !== null ? (
                        <CBadge color="info" className="fw-normal">
                          {age} años
                        </CBadge>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-wrap gap-1">
                        {dancer.academies?.length > 0 ? (
                          dancer.academies.map((academy) => (
                            <CBadge
                              key={academy.id}
                              color="primary"
                              className="fw-normal"
                              style={{ fontSize: '0.75rem' }}
                            >
                              {academy.name}
                            </CBadge>
                          ))
                        ) : (
                          <span className="text-body-secondary">Sin academia</span>
                        )}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup role="group" className="justify-content-end">
                        <PermissionGate permission={PERMISSIONS.DANCERS_UPDATE}>
                          <CTooltip content="Editar bailarín">
                            <CButton
                              color="secondary"
                              variant="outline"
                              size="sm"
                              disabled={!canUpdate || isLoading}
                              onClick={() => setEditModalState({ visible: true, dancer })}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          </CTooltip>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.DANCERS_DELETE}>
                          <CTooltip content="Eliminar bailarín">
                            <CButton
                              color="danger"
                              variant="outline"
                              size="sm"
                              disabled={!canDelete || isLoading}
                              onClick={() =>
                                setDeleteState({ visible: true, dancer, submitting: false })
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
          Mostrando {dancers.length} de {meta.total} bailarines
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

      <DancerFormModal
        key={createModalOpen ? 'create-open' : 'create-closed'}
        mode="create"
        visible={createModalOpen}
        submitting={actionSubmitting}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        academies={academies}
      />
      <DancerFormModal
        key={editModalState.visible ? `edit-${editModalState.dancer?.id ?? 'new'}` : 'edit-hidden'}
        mode="edit"
        visible={editModalState.visible}
        submitting={actionSubmitting}
        onClose={() => setEditModalState({ visible: false, dancer: null })}
        onSubmit={handleEditSubmit}
        dancer={editModalState.dancer}
        academies={academies}
      />
      <DeleteDancerModal
        visible={deleteState.visible}
        onClose={() => setDeleteState({ visible: false, dancer: null, submitting: false })}
        onConfirm={handleDeleteConfirm}
        dancer={deleteState.dancer}
        submitting={deleteState.submitting}
      />
    </>
  )
}

export default DancersTab
