import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilExternalLink,
  cilLocationPin,
  cilReload,
  cilWarning,
  cilXCircle,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'

import { usePermissions } from '../../hooks/usePermissions'
import { listAcademies } from '../../services/academiesApi'
import { getAcademyEvents } from '../../services/eventAcademiesApi'
import { HttpError } from '../../services/httpClient'

// Configuración de estados
const STATUS_CONFIG = {
  invited: {
    color: 'warning',
    label: 'Invitación Pendiente',
    icon: cilClock,
  },
  accepted: {
    color: 'info',
    label: 'En Registro',
    icon: cilCheckCircle,
  },
  rejected: {
    color: 'danger',
    label: 'Rechazado',
    icon: cilXCircle,
  },
  registered: {
    color: 'primary',
    label: 'Registro Enviado',
    icon: cilClock,
  },
  completed: {
    color: 'success',
    label: 'Completado',
    icon: cilCheckCircle,
  },
}

const EVENT_STATUS_CONFIG = {
  draft: { color: 'secondary', label: 'Borrador' },
  open: { color: 'success', label: 'Abierto' },
  closed: { color: 'warning', label: 'Cerrado' },
  finished: { color: 'dark', label: 'Finalizado' },
}

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

const formatDate = (value) => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date)
  } catch {
    return '—'
  }
}

const isDateSoon = (dateString, daysThreshold = 3) => {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= daysThreshold
}

const AcademyEvents = () => {
  const navigate = useNavigate()
  const { isAdmin, academyId: userAcademyId, academy: userAcademy } = usePermissions()

  // Estados
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [events, setEvents] = useState([])

  // Estado para selección de academia (admin)
  const [academies, setAcademies] = useState([])
  const [selectedAcademyId, setSelectedAcademyId] = useState('')
  const [loadingAcademies, setLoadingAcademies] = useState(false)

  // Filtro de estado
  const [statusFilter, setStatusFilter] = useState('')

  // Determinar el academyId a usar
  const effectiveAcademyId = useMemo(() => {
    if (isAdmin && selectedAcademyId) {
      return selectedAcademyId
    }
    return userAcademyId
  }, [isAdmin, selectedAcademyId, userAcademyId])

  // Cargar lista de academias (solo admin)
  useEffect(() => {
    const loadAcademies = async () => {
      if (!isAdmin) return
      setLoadingAcademies(true)
      try {
        const response = await listAcademies({ limit: 100 })
        setAcademies(response?.data || response || [])
        // Si hay un academyId del usuario, seleccionarlo por defecto
        if (userAcademyId && !selectedAcademyId) {
          setSelectedAcademyId(userAcademyId)
        }
      } catch (err) {
        console.error('Error loading academies:', err)
      } finally {
        setLoadingAcademies(false)
      }
    }
    loadAcademies()
  }, [isAdmin, userAcademyId, selectedAcademyId])

  // Cargar eventos de la academia
  const loadEvents = useCallback(async () => {
    if (!effectiveAcademyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getAcademyEvents(effectiveAcademyId)
      setEvents(response?.data || response || [])
    } catch (err) {
      console.error('Error loading events:', err)
      setError(getErrorMessage(err, 'Error al cargar los eventos'))
    } finally {
      setLoading(false)
    }
  }, [effectiveAcademyId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Filtrar eventos por estado
  const filteredEvents = useMemo(() => {
    if (!statusFilter) return events
    return events.filter((item) => item.status === statusFilter)
  }, [events, statusFilter])

  // Agrupar eventos
  const groupedEvents = useMemo(() => {
    const pending = filteredEvents.filter((e) => e.status === 'invited')
    const inProgress = filteredEvents.filter((e) => ['accepted', 'registered'].includes(e.status))
    const completed = filteredEvents.filter((e) => e.status === 'completed')
    const rejected = filteredEvents.filter((e) => e.status === 'rejected')
    
    return { pending, inProgress, completed, rejected }
  }, [filteredEvents])

  // Obtener nombre de academia para mostrar
  const academyName = useMemo(() => {
    if (userAcademy?.name) return userAcademy.name
    const found = academies.find((a) => a.id === effectiveAcademyId)
    return found?.name || 'Mi Academia'
  }, [userAcademy, academies, effectiveAcademyId])

  // Navegar a registro de evento
  const handleViewEvent = (eventId) => {
    navigate(`/academy/events/${eventId}`)
  }

  // Renderizar tarjeta de evento
  const renderEventCard = (item) => {
    const event = item.event || item
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.invited
    const eventStatusConfig = EVENT_STATUS_CONFIG[event.status] || EVENT_STATUS_CONFIG.draft
    const registrationEndingSoon = isDateSoon(event.registrationEndDate, 3)

    return (
      <CCard key={item.eventId || event.id} className="mb-3 border-start border-start-4" style={{ borderLeftColor: `var(--cui-${statusConfig.color})` }}>
        <CCardBody>
          <CRow className="align-items-center">
            <CCol md={6}>
              <h5 className="mb-1">{event.name}</h5>
              <div className="text-body-secondary small">
                <CIcon icon={cilCalendar} className="me-1" size="sm" />
                {formatDate(event.startDate)} - {formatDate(event.endDate)}
              </div>
              {event.location && (
                <div className="text-body-secondary small">
                  <CIcon icon={cilLocationPin} className="me-1" size="sm" />
                  {event.location.name}
                </div>
              )}
            </CCol>
            <CCol md={3} className="my-2 my-md-0">
              <div className="d-flex flex-wrap gap-1">
                <CBadge color={statusConfig.color}>
                  <CIcon icon={statusConfig.icon} className="me-1" size="sm" />
                  {statusConfig.label}
                </CBadge>
                <CBadge color={eventStatusConfig.color} className="opacity-75">
                  {eventStatusConfig.label}
                </CBadge>
              </div>
              {registrationEndingSoon && item.status === 'invited' && (
                <div className="mt-2">
                  <CBadge color="danger" textColor="white" className="small">
                    <CIcon icon={cilWarning} className="me-1" size="sm" />
                    Registro por cerrar
                  </CBadge>
                </div>
              )}
            </CCol>
            <CCol md={3} className="text-md-end">
              <CButton
                color="primary"
                size="sm"
                onClick={() => handleViewEvent(item.eventId || event.id)}
              >
                {item.status === 'invited' ? 'Ver Invitación' : 'Ver Registro'}
                <CIcon icon={cilExternalLink} className="ms-1" size="sm" />
              </CButton>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <>
      <CRow className="mb-4 align-items-center">
        <CCol>
          <h4 className="mb-0">
            <CIcon icon={cilCalendar} className="me-2" />
            {isAdmin ? 'Eventos de Academias' : `Mis Eventos - ${academyName}`}
          </h4>
        </CCol>
        <CCol xs="auto">
          <CButton color="light" onClick={loadEvents} disabled={loading}>
            <CIcon icon={cilReload} className={loading ? 'animate-spin' : ''} />
          </CButton>
        </CCol>
      </CRow>

      {/* Selector de academia (solo admin) */}
      {isAdmin && (
        <CCard className="mb-4">
          <CCardBody>
            <CRow className="align-items-center">
              <CCol md={3}>
                <strong>Seleccionar Academia:</strong>
              </CCol>
              <CCol md={6}>
                <CFormSelect
                  value={selectedAcademyId}
                  onChange={(e) => setSelectedAcademyId(e.target.value)}
                  disabled={loadingAcademies}
                >
                  <option value="">-- Seleccionar academia --</option>
                  {academies.map((academy) => (
                    <option key={academy.id} value={academy.id}>
                      {academy.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              {loadingAcademies && (
                <CCol md={3}>
                  <CSpinner size="sm" />
                </CCol>
              )}
            </CRow>
          </CCardBody>
        </CCard>
      )}

      {/* Filtro por estado */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="align-items-center">
            <CCol md={3}>
              <strong>Filtrar por estado:</strong>
            </CCol>
            <CCol md={6}>
              <CFormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="invited">Invitaciones pendientes</option>
                <option value="accepted">En registro</option>
                <option value="registered">Registro enviado</option>
                <option value="completed">Completados</option>
                <option value="rejected">Rechazados</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Estado de carga */}
      {loading && (
        <CCard>
          <CCardBody className="text-center py-5">
            <CSpinner color="primary" />
            <p className="mt-3 text-body-secondary">Cargando eventos...</p>
          </CCardBody>
        </CCard>
      )}

      {/* Error */}
      {!loading && error && (
        <CAlert color="danger" className="d-flex align-items-center">
          <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </CAlert>
      )}

      {/* Sin academia seleccionada (admin) */}
      {!loading && !error && isAdmin && !effectiveAcademyId && (
        <CAlert color="info">
          <CIcon icon={cilWarning} className="me-2" />
          Selecciona una academia para ver sus eventos.
        </CAlert>
      )}

      {/* Sin eventos */}
      {!loading && !error && effectiveAcademyId && filteredEvents.length === 0 && (
        <CCard>
          <CCardBody className="text-center py-5">
            <CIcon icon={cilCalendar} size="3xl" className="text-body-secondary opacity-50 mb-3" />
            <h5 className="text-body-secondary">No hay eventos disponibles</h5>
            <p className="text-body-secondary small">
              {statusFilter 
                ? 'No hay eventos con el estado seleccionado' 
                : 'No tienes invitaciones a eventos por el momento'}
            </p>
          </CCardBody>
        </CCard>
      )}

      {/* Lista de eventos */}
      {!loading && !error && effectiveAcademyId && filteredEvents.length > 0 && (
        <>
          {/* Invitaciones pendientes */}
          {groupedEvents.pending.length > 0 && !statusFilter && (
            <CCard className="mb-4">
              <CCardHeader className="bg-warning-subtle">
                <CIcon icon={cilClock} className="me-2" />
                <strong>Invitaciones Pendientes</strong>
                <CBadge color="warning" className="ms-2">{groupedEvents.pending.length}</CBadge>
              </CCardHeader>
              <CCardBody>
                {groupedEvents.pending.map(renderEventCard)}
              </CCardBody>
            </CCard>
          )}

          {/* En progreso */}
          {groupedEvents.inProgress.length > 0 && !statusFilter && (
            <CCard className="mb-4">
              <CCardHeader className="bg-info-subtle">
                <CIcon icon={cilCheckCircle} className="me-2" />
                <strong>Registros en Progreso</strong>
                <CBadge color="info" className="ms-2">{groupedEvents.inProgress.length}</CBadge>
              </CCardHeader>
              <CCardBody>
                {groupedEvents.inProgress.map(renderEventCard)}
              </CCardBody>
            </CCard>
          )}

          {/* Completados */}
          {groupedEvents.completed.length > 0 && !statusFilter && (
            <CCard className="mb-4">
              <CCardHeader className="bg-success-subtle">
                <CIcon icon={cilCheckCircle} className="me-2" />
                <strong>Registros Completados</strong>
                <CBadge color="success" className="ms-2">{groupedEvents.completed.length}</CBadge>
              </CCardHeader>
              <CCardBody>
                {groupedEvents.completed.map(renderEventCard)}
              </CCardBody>
            </CCard>
          )}

          {/* Rechazados */}
          {groupedEvents.rejected.length > 0 && !statusFilter && (
            <CCard className="mb-4">
              <CCardHeader className="bg-danger-subtle">
                <CIcon icon={cilXCircle} className="me-2" />
                <strong>Invitaciones Rechazadas</strong>
                <CBadge color="danger" className="ms-2">{groupedEvents.rejected.length}</CBadge>
              </CCardHeader>
              <CCardBody>
                {groupedEvents.rejected.map(renderEventCard)}
              </CCardBody>
            </CCard>
          )}

          {/* Vista filtrada */}
          {statusFilter && (
            <CCard className="mb-4">
              <CCardBody>
                {filteredEvents.map(renderEventCard)}
              </CCardBody>
            </CCard>
          )}
        </>
      )}
    </>
  )
}

export default AcademyEvents
