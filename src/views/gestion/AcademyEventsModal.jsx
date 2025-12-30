import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilBan,
  cilPlus,
  cilReload,
  cilSearch,
  cilTrash,
  cilArrowRight,
  cilEnvelopeClosed,
  cilCheckAlt,
  cilFilter,
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
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
  CTooltip,
} from '@coreui/react'

import { listEvents } from '../../services/eventsApi'
import {
  getAcademyEvents,
  assignAcademyToEvent,
  removeAcademyFromEvent,
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

const TIME_FILTER_OPTIONS = [
  { value: '', label: 'Todos los tiempos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'past', label: 'Pasados' },
  { value: 'ongoing', label: 'En curso' },
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

const getEventTimeStatus = (event) => {
  if (!event) return 'unknown'
  const now = Date.now()
  const start = event.startDate ? new Date(event.startDate).getTime() : null
  const end = event.endDate ? new Date(event.endDate).getTime() : null

  if (start && end) {
    if (now < start) return 'upcoming'
    if (now > end) return 'past'
    return 'ongoing'
  }
  if (start && !end) {
    return now < start ? 'upcoming' : 'ongoing'
  }
  return 'unknown'
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

// ==========================================
// Sub-componente: Panel de Asignación
// ==========================================

const AssignEventsPanel = ({
  academy,
  assignedEventIds,
  onAssign,
  isSubmitting,
}) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await listEvents()
        setEvents(Array.isArray(response) ? response : [])
      } catch (err) {
        console.error('Error loading events', err)
        setError(getErrorMessage(err, 'Error al cargar eventos'))
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  const availableEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const now = Date.now()

    return events
      .filter((event) => !assignedEventIds.has(event.id))
      // Mostrar solo eventos futuros o en curso
      .filter((event) => {
        const end = event.endDate ? new Date(event.endDate).getTime() : null
        if (end && end < now) return false // Excluir eventos pasados
        return true
      })
      .filter((event) => {
        if (!normalizedSearch) return true
        const haystack = [event.name, event.place, event.address]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        // Ordenar por fecha de inicio
        const dateA = a.startDate ? new Date(a.startDate).getTime() : Infinity
        const dateB = b.startDate ? new Date(b.startDate).getTime() : Infinity
        return dateA - dateB
      })
  }, [events, assignedEventIds, search])

  const handleToggle = (eventId) => {
    setSelectedIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleSelectAll = () => {
    const allIds = availableEvents.map((e) => e.id)
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
        Asignar a Eventos
      </h6>

      <CInputGroup className="mb-3">
        <CInputGroupText>
          <CIcon icon={cilSearch} />
        </CInputGroupText>
        <CFormInput
          placeholder="Buscar eventos disponibles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </CInputGroup>

      {availableEvents.length === 0 ? (
        <CAlert color="info" className="mb-0">
          {search
            ? 'No se encontraron eventos con ese criterio'
            : 'No hay eventos disponibles para asignar'}
        </CAlert>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-body-secondary">
              {availableEvents.length} evento(s) disponible(s)
            </small>
            <CButton
              color="link"
              size="sm"
              onClick={handleSelectAll}
              className="p-0"
            >
              {availableEvents.every((e) => selectedIds.includes(e.id))
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </CButton>
          </div>

          <div
            className="border rounded mb-3 overflow-auto"
            style={{ maxHeight: '200px' }}
          >
            <CListGroup flush>
              {availableEvents.map((event) => {
                const isSelected = selectedIds.includes(event.id)
                const timeStatus = getEventTimeStatus(event)
                return (
                  <CListGroupItem
                    key={event.id}
                    className="d-flex align-items-center gap-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggle(event.id)}
                    color={isSelected ? 'primary' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(event.id)}
                      className="form-check-input m-0"
                    />
                    <div className="flex-grow-1">
                      <div className="fw-medium">{event.name}</div>
                      <small className="text-body-secondary d-flex align-items-center gap-2">
                        <CIcon icon={cilCalendar} size="sm" />
                        {formatDate(event.startDate)}
                        {timeStatus === 'upcoming' && (
                          <CBadge color="success" size="sm">Próximo</CBadge>
                        )}
                        {timeStatus === 'ongoing' && (
                          <CBadge color="warning" size="sm">En curso</CBadge>
                        )}
                      </small>
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
                Asignando...
              </>
            ) : (
              <>
                <CIcon icon={cilEnvelopeClosed} className="me-2" />
                Invitar a {selectedIds.length > 0 ? `${selectedIds.length} evento(s)` : 'eventos'}
              </>
            )}
          </CButton>
        </>
      )}
    </div>
  )
}

AssignEventsPanel.propTypes = {
  academy: PropTypes.object.isRequired,
  assignedEventIds: PropTypes.instanceOf(Set).isRequired,
  onAssign: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
}

// ==========================================
// Componente Principal: AcademyEventsModal
// ==========================================

const AcademyEventsModal = ({
  visible,
  academy,
  onClose,
  isAdmin,
}) => {
  const navigate = useNavigate()

  const [academyEvents, setAcademyEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeFilter, setTimeFilter] = useState('')

  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const [activeTab, setActiveTab] = useState('list')

  const loadAcademyEvents = useCallback(async () => {
    if (!academy?.id) return

    setLoading(true)
    setError(null)
    try {
      const response = await getAcademyEvents(academy.id)
      setAcademyEvents(Array.isArray(response) ? response : [])
    } catch (err) {
      console.error('Error loading academy events', err)
      setError(getErrorMessage(err, 'Error al cargar eventos de la academia'))
    } finally {
      setLoading(false)
    }
  }, [academy?.id])

  useEffect(() => {
    if (visible && academy?.id) {
      loadAcademyEvents()
    }
  }, [visible, academy?.id, loadAcademyEvents])

  useEffect(() => {
    if (!visible) {
      // Reset state on close
      setAcademyEvents([])
      setSearch('')
      setStatusFilter('')
      setTimeFilter('')
      setFeedback(null)
      setActiveTab('list')
    }
  }, [visible])

  useEffect(() => {
    if (!feedback) return
    const timeoutId = setTimeout(() => setFeedback(null), 5000)
    return () => clearTimeout(timeoutId)
  }, [feedback])

  const assignedEventIds = useMemo(
    () => new Set(academyEvents.map((ae) => ae.eventId || ae.event?.id)),
    [academyEvents]
  )

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return academyEvents
      .filter((ae) => {
        if (statusFilter && ae.status !== statusFilter) return false

        const event = ae.event || {}
        const timeStatus = getEventTimeStatus(event)

        if (timeFilter && timeStatus !== timeFilter) return false

        if (normalizedSearch) {
          const haystack = [event.name, event.place, event.address]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(normalizedSearch)
        }

        return true
      })
      .sort((a, b) => {
        // Ordenar por fecha de inicio (más reciente primero)
        const dateA = a.event?.startDate ? new Date(a.event.startDate).getTime() : 0
        const dateB = b.event?.startDate ? new Date(b.event.startDate).getTime() : 0
        return dateB - dateA
      })
  }, [academyEvents, search, statusFilter, timeFilter])

  // Conteo por estado
  const statusCounts = useMemo(() => {
    const counts = { invited: 0, accepted: 0, rejected: 0, registered: 0, completed: 0 }
    academyEvents.forEach((ae) => {
      if (counts[ae.status] !== undefined) {
        counts[ae.status]++
      }
    })
    return counts
  }, [academyEvents])

  // Conteo por tiempo
  const timeCounts = useMemo(() => {
    const counts = { upcoming: 0, past: 0, ongoing: 0 }
    academyEvents.forEach((ae) => {
      const timeStatus = getEventTimeStatus(ae.event)
      if (counts[timeStatus] !== undefined) {
        counts[timeStatus]++
      }
    })
    return counts
  }, [academyEvents])

  const handleAssign = async (eventIds) => {
    if (!academy?.id || eventIds.length === 0) return

    setAssignSubmitting(true)
    setFeedback(null)

    try {
      // Asignar uno por uno ya que la API espera academyId + eventId
      for (const eventId of eventIds) {
        await assignAcademyToEvent({
          academyId: academy.id,
          eventId,
        })
      }

      setFeedback({
        type: 'success',
        message: `Academia invitada a ${eventIds.length} evento(s) exitosamente`,
      })
      await loadAcademyEvents()
      setActiveTab('list')
    } catch (err) {
      console.error('Error assigning events', err)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(err, 'Error al asignar eventos'),
      })
    } finally {
      setAssignSubmitting(false)
    }
  }

  const handleRemove = async (eventId) => {
    if (!academy?.id || !eventId) return
    if (!window.confirm('¿Estás seguro de cancelar esta invitación?')) return

    setRemovingId(eventId)
    setFeedback(null)

    try {
      await removeAcademyFromEvent(academy.id, eventId)
      setFeedback({
        type: 'success',
        message: 'Invitación cancelada exitosamente',
      })
      await loadAcademyEvents()
    } catch (err) {
      console.error('Error removing event', err)
      setFeedback({
        type: 'danger',
        message: getErrorMessage(err, 'Error al cancelar invitación'),
      })
    } finally {
      setRemovingId(null)
    }
  }

  const handleViewRegistration = (eventId) => {
    navigate(`/academy/events/${eventId}?academyId=${academy.id}`)
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
          Eventos de la Academia
          {academy && <small className="text-body-secondary ms-2">— {academy.name}</small>}
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

        {/* Resumen */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <CBadge color="secondary" className="px-3 py-2">
            Total: {academyEvents.length}
          </CBadge>
          <CBadge color="success" className="px-3 py-2" style={{ opacity: timeCounts.upcoming > 0 ? 1 : 0.5 }}>
            Próximos: {timeCounts.upcoming}
          </CBadge>
          <CBadge color="warning" className="px-3 py-2" style={{ opacity: timeCounts.ongoing > 0 ? 1 : 0.5 }}>
            En curso: {timeCounts.ongoing}
          </CBadge>
          <CBadge color="dark" className="px-3 py-2" style={{ opacity: timeCounts.past > 0 ? 1 : 0.5 }}>
            Pasados: {timeCounts.past}
          </CBadge>
        </div>

        {/* Tabs */}
        <CNav variant="tabs" className="mb-3">
          <CNavItem>
            <CNavLink
              active={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
              style={{ cursor: 'pointer' }}
            >
              <CIcon icon={cilCalendar} className="me-2" />
              Eventos Asignados ({academyEvents.length})
            </CNavLink>
          </CNavItem>
          {isAdmin && (
            <CNavItem>
              <CNavLink
                active={activeTab === 'assign'}
                onClick={() => setActiveTab('assign')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Asignar Eventos
              </CNavLink>
            </CNavItem>
          )}
        </CNav>

        <CTabContent>
          {/* Tab Lista */}
          <CTabPane visible={activeTab === 'list'}>
            <CRow className="g-2 mb-3">
              <CCol sm={4}>
                <CInputGroup size="sm">
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Buscar evento..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              <CCol sm={4}>
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
              <CCol sm={4}>
                <CFormSelect
                  size="sm"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  {TIME_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            {/* Badges de estado de registro */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              {Object.entries(REGISTRATION_STATUS).map(([status, config]) => (
                <CBadge
                  key={status}
                  color={config.color}
                  className="px-2 py-1"
                  style={{ 
                    opacity: statusCounts[status] > 0 ? 1 : 0.5,
                    cursor: 'pointer'
                  }}
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                >
                  <CIcon icon={config.icon} size="sm" className="me-1" />
                  {config.label}: {statusCounts[status]}
                </CBadge>
              ))}
            </div>

            {loading ? (
              <div className="d-flex justify-content-center py-4">
                <CSpinner color="primary" />
              </div>
            ) : error ? (
              <CAlert color="danger">{error}</CAlert>
            ) : filteredEvents.length === 0 ? (
              <CAlert color="info" className="mb-0">
                {academyEvents.length === 0
                  ? 'Esta academia no tiene eventos asignados'
                  : 'No se encontraron eventos con los filtros aplicados'}
              </CAlert>
            ) : (
              <div
                className="border rounded overflow-auto"
                style={{ maxHeight: '400px' }}
              >
                <CListGroup flush>
                  {filteredEvents.map((ae) => {
                    const event = ae.event || {}
                    const status = REGISTRATION_STATUS[ae.status] || REGISTRATION_STATUS.invited
                    const eventId = ae.eventId || event.id
                    const isRemoving = removingId === eventId
                    const timeStatus = getEventTimeStatus(event)

                    return (
                      <CListGroupItem
                        key={eventId}
                        className="d-flex flex-column gap-2"
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <CBadge color={status.color} shape="rounded-pill">
                              <CIcon icon={status.icon} size="sm" className="me-1" />
                              {status.label}
                            </CBadge>
                            {timeStatus === 'upcoming' && (
                              <CBadge color="success" shape="rounded-pill">Próximo</CBadge>
                            )}
                            {timeStatus === 'ongoing' && (
                              <CBadge color="warning" shape="rounded-pill">En curso</CBadge>
                            )}
                            {timeStatus === 'past' && (
                              <CBadge color="dark" shape="rounded-pill">Finalizado</CBadge>
                            )}
                          </div>

                          <CButtonGroup size="sm">
                            {/* Ver registro */}
                            <CTooltip content="Ver registro">
                              <CButton
                                color="primary"
                                variant="ghost"
                                onClick={() => handleViewRegistration(eventId)}
                              >
                                <CIcon icon={cilArrowRight} />
                              </CButton>
                            </CTooltip>

                            {/* Cancelar invitación (solo si status es 'invited' y es admin) */}
                            {isAdmin && ae.status === 'invited' && (
                              <CTooltip content="Cancelar invitación">
                                <CButton
                                  color="danger"
                                  variant="ghost"
                                  disabled={isRemoving}
                                  onClick={() => handleRemove(eventId)}
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
                        </div>

                        <div>
                          <div className="fw-semibold">{event.name || 'Sin nombre'}</div>
                          <small className="text-body-secondary d-flex align-items-center gap-2">
                            <CIcon icon={cilCalendar} size="sm" />
                            {formatDate(event.startDate)}
                            {event.endDate && ` — ${formatDate(event.endDate)}`}
                          </small>
                          {event.place && (
                            <small className="text-body-secondary d-block">
                              📍 {event.place}
                            </small>
                          )}
                        </div>

                        {/* Fechas de registro */}
                        {(ae.acceptedAt || ae.registeredAt || ae.completedAt) && (
                          <div className="d-flex gap-3 text-body-secondary small border-top pt-2">
                            {ae.acceptedAt && (
                              <span>Aceptado: {formatDate(ae.acceptedAt)}</span>
                            )}
                            {ae.registeredAt && (
                              <span>Registrado: {formatDate(ae.registeredAt)}</span>
                            )}
                            {ae.completedAt && (
                              <span>Validado: {formatDate(ae.completedAt)}</span>
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
                  onClick={loadAcademyEvents}
                >
                  <CIcon icon={cilReload} className="me-1" />
                  Actualizar
                </CButton>
              </div>
            )}
          </CTabPane>

          {/* Tab Asignar */}
          {isAdmin && (
            <CTabPane visible={activeTab === 'assign'}>
              <AssignEventsPanel
                academy={academy}
                assignedEventIds={assignedEventIds}
                onAssign={handleAssign}
                isSubmitting={assignSubmitting}
              />
            </CTabPane>
          )}
        </CTabContent>
      </CModalBody>

      <CModalFooter className="bg-body-tertiary">
        <CButton color="secondary" onClick={onClose}>
          Cerrar
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

AcademyEventsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  academy: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
}

export default AcademyEventsModal
