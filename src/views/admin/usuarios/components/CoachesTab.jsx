import React, { useCallback, useEffect, useMemo, useState } from 'react'

import CIcon from '@coreui/icons-react'
import {
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
import { createCoach, deleteCoach, listCoaches, updateCoach } from '../../../../services/coachesApi'
import { PERMISSIONS } from '../../../../config/permissions'
import PermissionGate from '../../../../components/PermissionGate'

const DEFAULT_FILTERS = {
  search: '',
  academyId: '',
  page: 1,
  limit: 10,
}

const LIMIT_OPTIONS = [10, 20, 50, 100]

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
  phone: '',
  mail: '',
  academyId: '',
}

const CoachFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  coach,
  academies = [],
}) => {
  const isEditMode = mode === 'edit'

  // Estado inicial calculado una vez al montar (el componente se remonta via key cuando cambia visible/coach)
  const getInitialState = () =>
    isEditMode && coach
      ? {
          name: coach.name ?? '',
          phone: coach.phone ?? '',
          mail: coach.mail ?? '',
          academyId: coach.academyId ?? coach.academy?.id ?? '',
        }
      : initialFormState

  const [formState, setFormState] = useState(getInitialState)
  const [errors, setErrors] = useState({})

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.name.trim()) {
      validationErrors.name = 'El nombre es obligatorio'
    }

    if (!formState.phone.trim()) {
      validationErrors.phone = 'El teléfono es obligatorio'
    }

    if (!formState.mail.trim()) {
      validationErrors.mail = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.mail.trim())) {
      validationErrors.mail = 'El correo no tiene un formato válido'
    }

    if (!formState.academyId) {
      validationErrors.academyId = 'Debes seleccionar una academia'
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
      phone: formState.phone.trim(),
      mail: formState.mail.trim().toLowerCase(),
      academyId: formState.academyId,
    }

    onSubmit(payload)
  }

  const title = isEditMode ? 'Editar profesor' : 'Nuevo profesor'

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
              <CFormLabel htmlFor="coach-name">Nombre completo *</CFormLabel>
              <CFormInput
                id="coach-name"
                value={formState.name}
                onChange={handleChange('name')}
                disabled={submitting}
                invalid={Boolean(errors.name)}
                autoFocus
                placeholder="Nombre completo del profesor"
              />
              {errors.name ? <div className="invalid-feedback d-block">{errors.name}</div> : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="coach-academy">Academia *</CFormLabel>
              <CFormSelect
                id="coach-academy"
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
            <CCol md={6}>
              <CFormLabel htmlFor="coach-mail">Correo electrónico *</CFormLabel>
              <CFormInput
                id="coach-mail"
                type="email"
                value={formState.mail}
                onChange={handleChange('mail')}
                disabled={submitting}
                invalid={Boolean(errors.mail)}
                placeholder="correo@ejemplo.com"
              />
              {errors.mail ? <div className="invalid-feedback d-block">{errors.mail}</div> : null}
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="coach-phone">Teléfono *</CFormLabel>
              <CFormInput
                id="coach-phone"
                type="tel"
                value={formState.phone}
                onChange={handleChange('phone')}
                disabled={submitting}
                invalid={Boolean(errors.phone)}
                placeholder="Teléfono de contacto"
              />
              {errors.phone ? <div className="invalid-feedback d-block">{errors.phone}</div> : null}
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

const DeleteCoachModal = ({ visible, onClose, onConfirm, coach, submitting }) => (
  <CModal
    alignment="center"
    visible={visible}
    onClose={submitting ? undefined : onClose}
    backdrop="static"
  >
    <CModalHeader closeButton={!submitting}>
      <CModalTitle>Eliminar profesor</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        ¿Estás seguro de que deseas eliminar al profesor <strong>{coach?.name}</strong>?
      </p>
      <p className="text-body-secondary mb-0">
        Esta acción eliminará al profesor de la academia. Esta acción no se puede deshacer.
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

const CoachesTab = ({ academies = [] }) => {
  const { hasPermission } = usePermissions()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [coaches, setCoaches] = useState([])
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
  const [editModalState, setEditModalState] = useState({ visible: false, coach: null })
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState({ visible: false, coach: null, submitting: false })

  const canRead = hasPermission(PERMISSIONS.COACHES_READ)
  const canCreate = hasPermission(PERMISSIONS.COACHES_CREATE)
  const canUpdate = hasPermission(PERMISSIONS.COACHES_UPDATE)
  const canDelete = hasPermission(PERMISSIONS.COACHES_DELETE)

  const normalizedFilters = useMemo(() => {
    return {
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      academyId: filters.academyId || undefined,
    }
  }, [filters])

  const loadCoaches = useCallback(async () => {
    if (!canRead) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await listCoaches(normalizedFilters)
      // El backend puede devolver array directo o { data, meta }
      const data = Array.isArray(response) ? response : response?.data
      setCoaches(Array.isArray(data) ? data : [])

      const responseMeta = response?.meta ?? {}
      setMeta({
        page: responseMeta.page ?? filters.page,
        limit: responseMeta.limit ?? filters.limit,
        totalPages: Math.max(responseMeta.totalPages ?? 1, 1),
        total: responseMeta.total ?? (Array.isArray(data) ? data.length : 0),
      })
    } catch (requestError) {
      console.error('Unable to load coaches', requestError)
      setError(getErrorMessage(requestError, 'No fue posible cargar los profesores'))
      setCoaches([])
    } finally {
      setIsLoading(false)
    }
  }, [filters.limit, filters.page, canRead, normalizedFilters])

  useEffect(() => {
    loadCoaches()
  }, [loadCoaches])

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
    loadCoaches()
  }

  const handleCreateSubmit = async (payload) => {
    setActionSubmitting(true)
    setFeedback(null)
    try {
      await createCoach(payload)
      setCreateModalOpen(false)
      setFeedback({ type: 'success', message: 'Profesor creado correctamente' })
      await loadCoaches()
      if (filters.page !== 1) {
        resetToFirstPage()
      }
    } catch (requestError) {
      console.error('Create coach failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo crear el profesor'),
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleEditSubmit = async (payload) => {
    if (!editModalState.coach) {
      return
    }

    setActionSubmitting(true)
    setFeedback(null)
    try {
      await updateCoach(editModalState.coach.id, payload)
      setEditModalState({ visible: false, coach: null })
      setFeedback({ type: 'success', message: 'Profesor actualizado correctamente' })
      await loadCoaches()
    } catch (requestError) {
      console.error('Update coach failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo actualizar el profesor'),
      })
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteState.coach) {
      return
    }

    setDeleteState((prev) => ({ ...prev, submitting: true }))
    setFeedback(null)
    try {
      await deleteCoach(deleteState.coach.id)
      setDeleteState({ visible: false, coach: null, submitting: false })
      setFeedback({ type: 'success', message: 'Profesor eliminado correctamente' })
      await loadCoaches()
    } catch (requestError) {
      console.error('Delete coach failed', requestError)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(requestError, 'No se pudo eliminar el profesor'),
      })
      setDeleteState((prev) => ({ ...prev, submitting: false }))
    }
  }

  // Crear un mapa de academias para lookup rápido
  const academiesMap = useMemo(() => {
    const map = new Map()
    academies.forEach((a) => map.set(a.id, a))
    return map
  }, [academies])

  if (!canRead) {
    return (
      <CAlert color="warning" className="mt-4">
        No tienes permisos para ver profesores.
      </CAlert>
    )
  }

  return (
    <>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <CButton color="secondary" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <CIcon icon={cilReload} className="me-2" /> Actualizar
        </CButton>
        <PermissionGate permission={PERMISSIONS.COACHES_CREATE}>
          <CButton color="primary" onClick={() => setCreateModalOpen(true)}>
            <CIcon icon={cilPlus} className="me-2" /> Nuevo profesor
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
              placeholder="Buscar por nombre, teléfono o correo"
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
              <CTableHeaderCell>Correo electrónico</CTableHeaderCell>
              <CTableHeaderCell>Teléfono</CTableHeaderCell>
              <CTableHeaderCell>Academia</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {isLoading ? (
              <CTableRow>
                <CTableDataCell colSpan={5} className="text-center py-4">
                  <CSpinner size="sm" className="me-2" /> Cargando profesores...
                </CTableDataCell>
              </CTableRow>
            ) : coaches.length === 0 ? (
              <CTableRow>
                <CTableDataCell colSpan={5} className="text-center py-4 text-body-secondary">
                  No se encontraron profesores con los filtros actuales.
                </CTableDataCell>
              </CTableRow>
            ) : (
              coaches.map((coach) => {
                const academy = coach.academy || academiesMap.get(coach.academyId)
                return (
                  <CTableRow key={coach.id} className="align-middle">
                    <CTableDataCell>
                      <div className="fw-semibold text-body">
                        <CIcon icon={cilUser} className="me-2 text-body-secondary" />
                        {coach.name}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CIcon
                        icon={cilEnvelopeClosed}
                        size="sm"
                        className="me-1 text-body-secondary"
                      />
                      {coach.mail}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CIcon icon={cilPhone} size="sm" className="me-1 text-body-secondary" />
                      {coach.phone}
                    </CTableDataCell>
                    <CTableDataCell>
                      {academy ? (
                        <CBadge color="primary" className="fw-normal">
                          {academy.name}
                        </CBadge>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup role="group" className="justify-content-end">
                        <PermissionGate permission={PERMISSIONS.COACHES_UPDATE}>
                          <CTooltip content="Editar profesor">
                            <CButton
                              color="secondary"
                              variant="outline"
                              size="sm"
                              disabled={!canUpdate || isLoading}
                              onClick={() => setEditModalState({ visible: true, coach })}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                          </CTooltip>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.COACHES_DELETE}>
                          <CTooltip content="Eliminar profesor">
                            <CButton
                              color="danger"
                              variant="outline"
                              size="sm"
                              disabled={!canDelete || isLoading}
                              onClick={() =>
                                setDeleteState({ visible: true, coach, submitting: false })
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
          Mostrando {coaches.length} de {meta.total} profesores
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

      <CoachFormModal
        key={createModalOpen ? 'create-open' : 'create-closed'}
        mode="create"
        visible={createModalOpen}
        submitting={actionSubmitting}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        academies={academies}
      />
      <CoachFormModal
        key={editModalState.visible ? `edit-${editModalState.coach?.id ?? 'new'}` : 'edit-hidden'}
        mode="edit"
        visible={editModalState.visible}
        submitting={actionSubmitting}
        onClose={() => setEditModalState({ visible: false, coach: null })}
        onSubmit={handleEditSubmit}
        coach={editModalState.coach}
        academies={academies}
      />
      <DeleteCoachModal
        visible={deleteState.visible}
        onClose={() => setDeleteState({ visible: false, coach: null, submitting: false })}
        onConfirm={handleDeleteConfirm}
        coach={deleteState.coach}
        submitting={deleteState.submitting}
      />
    </>
  )
}

export default CoachesTab
