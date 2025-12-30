import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilClock,
  cilBan,
  cilPlus,
  cilReload,
  cilSearch,
  cilTrash,
  cilWarning,
  cilArrowRight,
  cilEnvelopeClosed,
  cilCheckAlt,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
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

import { listAcademies } from '../../services/academiesApi'
import {
  getEventAcademies,
  assignAcademyToEvent,
  bulkAssignAcademiesToEvent,
  removeAcademyFromEvent,
  updateEventAcademyStatus,
} from '../../services/eventAcademiesApi'
import { HttpError } from '../../services/httpClient'

// ==========================================
// Constantes
// ==========================================

const REGISTRATION_STATUS = {
  invited: { label: 'Invitada', color: 'info', icon: cilEnvelopeClosed },
  accepted: { label: 'Aceptada', color: 'primary', icon: cilCheckAlt },
  rejected: { label: 'Rechazada', color: 'danger', icon: cilBan },
  registered: { label: 'Registrada', color: 'warning', icon: cilClock },
  completed: { label: 'Completada', color: 'success', icon: cilCheckCircle },
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'invited', label: 'Invitadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'registered', label: 'Registradas' },
  { value: 'completed', label: 'Completadas' },
]

// ==========================================
// Helpers
// ==========================================

const getErrorMessage = (error, fallback = 'Ocurrió un error inesperado') => {
  if (!error) return fallback
  if (error instanceof HttpError) {
    return error.body?.message || error.message || fallback
  }
  if (typeof error === 'string') return error
  return error.message ?? fallback
}

// ==========================================
// Sub-componente: Panel de Asignación
// ==========================================

const AssignAcademiesPanel = ({
  event,
  assignedAcademyIds,
  onAssign,
  isSubmitting,
}) => {
  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    const loadAcademies = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await listAcademies()
        setAcademies(Array.isArray(response) ? response : [])
      } catch (err) {
        console.error('Error loading academies', err)
        setError(getErrorMessage(err, 'Error al cargar academias'))
      } finally {
        setLoading(false)
      }
    }

    loadAcademies()
  }, [])

  const availableAcademies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return academies
      .filter((academy) => !assignedAcademyIds.has(academy.id))
      .filter((academy) => {
        if (!normalizedSearch) return true
        const haystack = [academy.name, academy.mail, academy.contactPhoneNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
  }, [academies, assignedAcademyIds, search])

  const handleToggle = (academyId) => {
    setSelectedIds((prev) =>
      prev.includes(academyId)
        ? prev.filter((id) => id !== academyId)
        : [...prev, academyId]
    )
  }

  const handleSelectAll = () => {
    const allIds = availableAcademies.map((a) => a.id)
    setSelectedIds((prev) => {
      const allSelected = allIds.every((id) => prev.includes(id))
      return allSelected
        ? prev.filter((id) => !allIds.includes(id))
        : [...new Set([...prev, ...allIds])]
    })
  }

  const handleAssign = () => {
    if (selectedIds.length === 0) return
    onAssign(selectedIds)
    setSelectedIds([])
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>
  }

  return (
    <div className="border rounded p-3 bg-body-tertiary">
      <h6 className="mb-3">
        <CIcon icon={cilPlus} className="me-2" />
        Invitar Academias
      </h6>

      <CInputGroup className="mb-3">
        <CInputGroupText>
          <CIcon icon={cilSearch} />
        </CInputGroupText>
        <CFormInput
          placeholder="Buscar academias disponibles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </CInputGroup>

      {availableAcademies.length === 0 ? (
        <CAlert color="info" className="mb-0">
          {search
            ? 'No se encontraron academias con ese criterio'
            : 'Todas las academias ya están invitadas'}
        </CAlert>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-body-secondary">
              {availableAcademies.length} academia(s) disponible(s)
            </small>
            <CButton
              color="link"
              size="sm"
              onClick={handleSelectAll}
              className="p-0"
            >
              {availableAcademies.every((a) => selectedIds.includes(a.id))
                ? 'Deseleccionar todas'
                : 'Seleccionar todas'}
            </CButton>
          </div>

          <div
            className="border rounded mb-3 overflow-auto"
            style={{ maxHeight: '200px' }}
          >
            <CListGroup flush>
              {availableAcademies.map((academy) => {
                const isSelected = selectedIds.includes(academy.id)
                return (
                  <CListGroupItem
                    key={academy.id}
                    className="d-flex align-items-center gap-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggle(academy.id)}
                    color={isSelected ? 'primary' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(academy.id)}
                      className="form-check-input m-0"
                    />
                    <div className="flex-grow-1">
                      <div className="fw-medium">{academy.name}</div>
                      <small className="text-body-secondary">{academy.mail}</small>
                    </div>
                  </CListGroupItem>
                )
              })}
            </CListGroup>
          </div>

          <CButton
            color="primary"
            disabled={selectedIds.length === 0 || isSubmitting}
            onClick={handleAssign}
            className="w-100"
          >
            {isSubmitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Enviando invitaciones...
              </>
            ) : (
              <>
                <CIcon icon={cilEnvelopeClosed} className="me-2" />
                Invitar {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </>
            )}
          </CButton>
        </>
      )}
    </div>
  )
}

AssignAcademiesPanel.propTypes = {
  event: PropTypes.object.isRequired,
  assignedAcademyIds: PropTypes.instanceOf(Set).isRequired,
  onAssign: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
}

// ==========================================
// Componente Principal: EventAcademiesModal
// ==========================================

const EventAcademiesModal = ({
  visible,
  event,
  onClose,
  isAdmin,
}) => {
  const navigate = useNavigate()

  const [eventAcademies, setEventAcademies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [validatingId, setValidatingId] = useState(null)

  const loadEventAcademies = useCallback(async () => {
    if (!event?.id) return

    setLoading(true)
    setError(null)
    try {
      const response = await getEventAcademies(event.id)
      setEventAcademies(Array.isArray(response) ? response : [])
    } catch (err) {
      console.error('Error loading event academies', err)
      setError(getErrorMessage(err, 'Error al cargar academias del evento'))
    } finally {
      setLoading(false)
    }
  }, [event?.id])

  useEffect(() => {
    if (visible && event?.id) {
      loadEventAcademies()
    }
  }, [visible, event?.id, loadEventAcademies])

  useEffect(() => {
    if (!visible) {
      // Reset state on close
      setEventAcademies([])
      setSearch('')
      setStatusFilter('')
      setFeedback(null)
    }
  }, [visible])

  useEffect(() => {
    if (!feedback) return
    const timeoutId = setTimeout(() => setFeedback(null), 5000)
    return () => clearTimeout(timeoutId)
  }, [feedback])

  const assignedAcademyIds = useMemo(
    () => new Set(eventAcademies.map((ea) => ea.academyId || ea.academy?.id)),
    [eventAcademies]
  )

  const filteredAcademies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return eventAcademies
      .filter((ea) => {
        if (statusFilter && ea.status !== statusFilter) return false

        if (normalizedSearch) {
          const academy = ea.academy || {}
          const haystack = [academy.name, academy.mail, academy.contactPhoneNumber]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(normalizedSearch)
        }

        return true
      })
      .sort((a, b) => {
        const nameA = a.academy?.name ?? ''
        const nameB = b.academy?.name ?? ''
        return nameA.localeCompare(nameB, 'es')
      })
  }, [eventAcademies, search, statusFilter])

  // Conteo por estado
  const statusCounts = useMemo(() => {
    const counts = { invited: 0, accepted: 0, rejected: 0, registered: 0, completed: 0 }
    eventAcademies.forEach((ea) => {
      if (counts[ea.status] !== undefined) {
        counts[ea.status]++
      }
    })
    return counts
  }, [eventAcademies])

  const handleAssign = async (academyIds) => {
    if (!event?.id || academyIds.length === 0) return

    setAssignSubmitting(true)
    setFeedback(null)

    try {
      if (academyIds.length === 1) {
        await assignAcademyToEvent({
          eventId: event.id,
          academyId: academyIds[0],
        })
      } else {
        await bulkAssignAcademiesToEvent({
          eventId: event.id,
          academyIds,
        })
      }

      setFeedback({
        type: 'success',
        message: `${academyIds.length} academia(s) invitada(s) exitosamente`,
      })
      await loadEventAcademies()
    } catch (err) {
      console.error('Error assigning academies', err)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(err, 'Error al invitar academias'),
      })
    } finally {
      setAssignSubmitting(false)
    }
  }

  const handleRemove = async (academyId) => {
    if (!event?.id || !academyId) return
    if (!window.confirm('¿Estás seguro de cancelar esta invitación?')) return

    setRemovingId(academyId)
    setFeedback(null)

    try {
      await removeAcademyFromEvent(academyId, event.id)
      setFeedback({
        type: 'success',
        message: 'Invitación cancelada exitosamente',
      })
      await loadEventAcademies()
    } catch (err) {
      console.error('Error removing academy', err)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(err, 'Error al cancelar invitación'),
      })
    } finally {
      setRemovingId(null)
    }
  }

  const handleValidate = async (academyId) => {
    if (!event?.id || !academyId) return
    if (!window.confirm('¿Confirmas validar el registro de esta academia?')) return

    setValidatingId(academyId)
    setFeedback(null)

    try {
      await updateEventAcademyStatus(academyId, event.id, { status: 'completed' })
      setFeedback({
        type: 'success',
        message: 'Registro validado exitosamente',
      })
      await loadEventAcademies()
    } catch (err) {
      console.error('Error validating registration', err)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(err, 'Error al validar registro'),
      })
    } finally {
      setValidatingId(null)
    }
  }

  const handleViewRegistration = (academyId) => {
    navigate(`/academy/events/${event.id}?academyId=${academyId}`)
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      backdrop="static"
      scrollable
    >
      <CModalHeader closeButton>
        <CModalTitle>
          Academias del Evento
          {event && <small className="text-body-secondary ms-2">— {event.name}</small>}
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        {feedback && (
          <CAlert
            color={feedback.type}
            dismissible
            onClose={() => setFeedback(null)}
            className="mb-3"
          >
            {feedback.message}
          </CAlert>
        )}

        {/* Resumen de estados */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <CBadge color="secondary" className="px-3 py-2">
            Total: {eventAcademies.length}
          </CBadge>
          {Object.entries(REGISTRATION_STATUS).map(([status, config]) => (
            <CBadge
              key={status}
              color={config.color}
              className="px-3 py-2"
              style={{ opacity: statusCounts[status] > 0 ? 1 : 0.5 }}
            >
              <CIcon icon={config.icon} size="sm" className="me-1" />
              {config.label}: {statusCounts[status]}
            </CBadge>
          ))}
        </div>

        <CRow className="g-4">
          {/* Panel izquierdo: Lista de academias asignadas */}
          <CCol lg={7}>
            <div className="border rounded p-3">
              <h6 className="mb-3">Academias Invitadas</h6>

              <CRow className="g-2 mb-3">
                <CCol sm={7}>
                  <CInputGroup size="sm">
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Buscar academia..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol sm={5}>
                  <CFormSelect
                    size="sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <CSpinner color="primary" />
                </div>
              ) : error ? (
                <CAlert color="danger">{error}</CAlert>
              ) : filteredAcademies.length === 0 ? (
                <CAlert color="info" className="mb-0">
                  {eventAcademies.length === 0
                    ? 'No hay academias invitadas a este evento'
                    : 'No se encontraron academias con los filtros aplicados'}
                </CAlert>
              ) : (
                <div
                  className="border rounded overflow-auto"
                  style={{ maxHeight: '400px' }}
                >
                  <CListGroup flush>
                    {filteredAcademies.map((ea) => {
                      const academy = ea.academy || {}
                      const status = REGISTRATION_STATUS[ea.status] || REGISTRATION_STATUS.invited
                      const academyId = ea.academyId || academy.id
                      const isRemoving = removingId === academyId
                      const isValidating = validatingId === academyId

                      return (
                        <CListGroupItem
                          key={academyId}
                          className="d-flex flex-column gap-2"
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <CBadge color={status.color} shape="rounded-pill">
                                <CIcon icon={status.icon} size="sm" className="me-1" />
                                {status.label}
                              </CBadge>
                              <div>
                                <div className="fw-medium">{academy.name || 'Sin nombre'}</div>
                                <small className="text-body-secondary">
                                  {academy.mail || 'Sin correo'}
                                </small>
                              </div>
                            </div>

                            {isAdmin && (
                              <CButtonGroup size="sm">
                                {/* Ver registro */}
                                <CTooltip content="Ver registro">
                                  <CButton
                                    color="primary"
                                    variant="ghost"
                                    onClick={() => handleViewRegistration(academyId)}
                                  >
                                    <CIcon icon={cilArrowRight} />
                                  </CButton>
                                </CTooltip>

                                {/* Validar registro (solo si status es 'registered') */}
                                {ea.status === 'registered' && (
                                  <CTooltip content="Validar registro">
                                    <CButton
                                      color="success"
                                      variant="ghost"
                                      disabled={isValidating}
                                      onClick={() => handleValidate(academyId)}
                                    >
                                      {isValidating ? (
                                        <CSpinner size="sm" />
                                      ) : (
                                        <CIcon icon={cilCheckCircle} />
                                      )}
                                    </CButton>
                                  </CTooltip>
                                )}

                                {/* Cancelar invitación (solo si status es 'invited') */}
                                {ea.status === 'invited' && (
                                  <CTooltip content="Cancelar invitación">
                                    <CButton
                                      color="danger"
                                      variant="ghost"
                                      disabled={isRemoving}
                                      onClick={() => handleRemove(academyId)}
                                    >
                                      {isRemoving ? (
                                        <CSpinner size="sm" />
                                      ) : (
                                        <CIcon icon={cilTrash} />
                                      )}
                                    </CButton>
                                  </CTooltip>
                                )}
                              </CButtonGroup>
                            )}
                          </div>

                          {/* Info adicional si hay */}
                          {(ea.registeredAt || ea.acceptedAt) && (
                            <div className="d-flex gap-3 text-body-secondary small">
                              {ea.acceptedAt && (
                                <span>
                                  Aceptado: {new Date(ea.acceptedAt).toLocaleDateString('es-MX')}
                                </span>
                              )}
                              {ea.registeredAt && (
                                <span>
                                  Registrado: {new Date(ea.registeredAt).toLocaleDateString('es-MX')}
                                </span>
                              )}
                            </div>
                          )}
                        </CListGroupItem>
                      )
                    })}
                  </CListGroup>
                </div>
              )}

              {!loading && (
                <div className="d-flex justify-content-end mt-3">
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    onClick={loadEventAcademies}
                  >
                    <CIcon icon={cilReload} className="me-1" />
                    Actualizar
                  </CButton>
                </div>
              )}
            </div>
          </CCol>

          {/* Panel derecho: Asignar nuevas academias */}
          {isAdmin && (
            <CCol lg={5}>
              <AssignAcademiesPanel
                event={event}
                assignedAcademyIds={assignedAcademyIds}
                onAssign={handleAssign}
                isSubmitting={assignSubmitting}
              />
            </CCol>
          )}
        </CRow>
      </CModalBody>

      <CModalFooter className="bg-body-tertiary">
        <CButton color="secondary" onClick={onClose}>
          Cerrar
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

EventAcademiesModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  event: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
}

export default EventAcademiesModal
