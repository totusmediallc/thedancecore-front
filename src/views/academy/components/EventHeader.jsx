import React from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CProgress,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilLocationPin,
  cilWarning,
  cilXCircle,
  cilPeople,
  cilMusic,
  cilUser,
} from '@coreui/icons'

import { API_BASE_URL } from '../../../config/apiConfig'

// Estados de participación con sus configuraciones
const REGISTRATION_STATUS_CONFIG = {
  invited: {
    color: 'warning',
    label: 'Invitación Pendiente',
    icon: cilClock,
    description: 'Tienes una invitación pendiente para este evento',
  },
  accepted: {
    color: 'info',
    label: 'En Registro',
    icon: cilCheckCircle,
    description: 'Has aceptado la invitación. Completa tu registro',
  },
  rejected: {
    color: 'danger',
    label: 'Rechazado',
    icon: cilXCircle,
    description: 'Has rechazado la invitación a este evento',
  },
  registered: {
    color: 'primary',
    label: 'Registro Enviado',
    icon: cilCheckCircle,
    description: 'Tu registro está en revisión por el administrador',
  },
  completed: {
    color: 'success',
    label: 'Completado',
    icon: cilCheckCircle,
    description: 'Tu registro ha sido validado exitosamente',
  },
}

// Estados del evento
const EVENT_STATUS_CONFIG = {
  draft: { color: 'secondary', label: 'Borrador' },
  open: { color: 'success', label: 'Abierto' },
  closed: { color: 'warning', label: 'Cerrado' },
  finished: { color: 'dark', label: 'Finalizado' },
}

const API_PUBLIC_BASE_URL = API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '')

const buildBannerUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_PUBLIC_BASE_URL}${normalized}`
}

const formatDate = (value, options = {}) => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      ...options,
    }).format(date)
  } catch {
    return '—'
  }
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return '—'
  }
}

const isDatePast = (dateString) => {
  if (!dateString) return false
  const date = new Date(dateString)
  return date < new Date()
}

const isDateSoon = (dateString, daysThreshold = 3) => {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= daysThreshold
}

const EventHeader = ({
  event,
  registration,
  stats,
  onAcceptInvitation,
  onRejectInvitation,
  onCompleteRegistration,
  isSubmitting,
  isReadOnly,
}) => {
  if (!event || !registration) {
    return (
      <CCard className="mb-4">
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3 text-body-secondary">Cargando información del evento...</p>
        </CCardBody>
      </CCard>
    )
  }

  const statusConfig = REGISTRATION_STATUS_CONFIG[registration.status] || REGISTRATION_STATUS_CONFIG.invited
  const eventStatusConfig = EVENT_STATUS_CONFIG[event.status] || EVENT_STATUS_CONFIG.draft
  const bannerUrl = buildBannerUrl(event.bannerUrl)
  
  const canModify = !isReadOnly && 
    registration.status === 'accepted' && 
    event.status === 'open' &&
    !isDatePast(event.updateDeadlineDate)

  const registrationEndingSoon = isDateSoon(event.registrationEndDate, 3)
  const updateDeadlineSoon = isDateSoon(event.updateDeadlineDate, 3)
  const updateDeadlinePassed = isDatePast(event.updateDeadlineDate)

  // Calcular progreso de registro
  const calculateProgress = () => {
    if (!stats) return 0
    let progress = 0
    if (stats.totalChoreographies > 0) progress += 40
    if (stats.totalDancers > 0) progress += 30
    if (stats.totalCoaches > 0) progress += 20
    if (stats.totalTshirtItems > 0) progress += 10
    return Math.min(progress, 100)
  }

  const registrationProgress = calculateProgress()
  const canSubmitRegistration = registrationProgress >= 70 && 
    registration.status === 'accepted' &&
    !updateDeadlinePassed

  return (
    <CCard className="mb-4 border-0 shadow-sm">
      {/* Banner del evento */}
      {bannerUrl && (
        <div 
          className="position-relative"
          style={{
            height: '200px',
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: 'var(--cui-card-border-radius) var(--cui-card-border-radius) 0 0',
          }}
        >
          <div 
            className="position-absolute w-100 h-100"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))',
              borderRadius: 'inherit',
            }}
          />
          <div className="position-absolute bottom-0 start-0 p-4 text-white">
            <h2 className="mb-1 fw-bold">{event.name}</h2>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span>
                <CIcon icon={cilCalendar} className="me-1" />
                {formatDate(event.startDate)} - {formatDate(event.endDate)}
              </span>
              {event.location && (
                <span>
                  <CIcon icon={cilLocationPin} className="me-1" />
                  {event.location.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <CCardBody>
        {/* Header sin banner */}
        {!bannerUrl && (
          <div className="mb-4">
            <h2 className="mb-1 fw-bold">{event.name}</h2>
            <div className="d-flex align-items-center gap-3 flex-wrap text-body-secondary">
              <span>
                <CIcon icon={cilCalendar} className="me-1" />
                {formatDate(event.startDate)} - {formatDate(event.endDate)}
              </span>
              {event.location && (
                <span>
                  <CIcon icon={cilLocationPin} className="me-1" />
                  {event.location.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Badges de estado */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <CBadge color={eventStatusConfig.color} className="px-3 py-2">
            Evento: {eventStatusConfig.label}
          </CBadge>
          <CBadge color={statusConfig.color} className="px-3 py-2">
            <CIcon icon={statusConfig.icon} className="me-1" />
            {statusConfig.label}
          </CBadge>
        </div>

        {/* Alertas de fechas importantes */}
        {registrationEndingSoon && registration.status === 'invited' && (
          <CAlert color="warning" className="d-flex align-items-center">
            <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
            <div>
              <strong>¡Atención!</strong> El período de registro termina el{' '}
              <strong>{formatDateTime(event.registrationEndDate)}</strong>
            </div>
          </CAlert>
        )}

        {updateDeadlineSoon && registration.status === 'accepted' && (
          <CAlert color="warning" className="d-flex align-items-center">
            <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
            <div>
              <strong>¡Atención!</strong> Fecha límite para modificaciones:{' '}
              <strong>{formatDateTime(event.updateDeadlineDate)}</strong>
            </div>
          </CAlert>
        )}

        {updateDeadlinePassed && registration.status === 'accepted' && (
          <CAlert color="danger" className="d-flex align-items-center">
            <CIcon icon={cilXCircle} className="flex-shrink-0 me-2" />
            <div>
              El período de modificaciones ha terminado. Solo puedes visualizar tu registro.
            </div>
          </CAlert>
        )}

        {/* Acciones según estado */}
        {registration.status === 'invited' && !isReadOnly && (
          <div className="bg-light rounded p-4 mb-4">
            <h5 className="mb-3">
              <CIcon icon={cilClock} className="me-2" />
              Invitación Pendiente
            </h5>
            <p className="text-body-secondary mb-3">
              Has sido invitado a participar en este evento. Acepta la invitación para 
              comenzar tu registro o recházala si no participarás.
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <CButton 
                color="success" 
                onClick={onAcceptInvitation}
                disabled={isSubmitting}
              >
                {isSubmitting ? <CSpinner size="sm" className="me-2" /> : null}
                Aceptar Invitación
              </CButton>
              <CButton 
                color="outline-danger" 
                onClick={onRejectInvitation}
                disabled={isSubmitting}
              >
                Rechazar
              </CButton>
            </div>
          </div>
        )}

        {registration.status === 'rejected' && (
          <CAlert color="danger" className="mb-4">
            <strong>Invitación rechazada.</strong> No participarás en este evento.
          </CAlert>
        )}

        {/* Progreso de registro y estadísticas */}
        {['accepted', 'registered', 'completed'].includes(registration.status) && stats && (
          <>
            {/* Estadísticas rápidas */}
            <CRow className="mb-4 g-3">
              <CCol xs={6} md={3}>
                <div className="border rounded p-3 text-center h-100">
                  <CIcon icon={cilMusic} size="xl" className="text-primary mb-2" />
                  <div className="fs-4 fw-bold">{stats.totalChoreographies || 0}</div>
                  <small className="text-body-secondary">Coreografías</small>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="border rounded p-3 text-center h-100">
                  <CIcon icon={cilPeople} size="xl" className="text-success mb-2" />
                  <div className="fs-4 fw-bold">{stats.totalDancers || 0}</div>
                  <small className="text-body-secondary">Bailarines</small>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="border rounded p-3 text-center h-100">
                  <CIcon icon={cilUser} size="xl" className="text-info mb-2" />
                  <div className="fs-4 fw-bold">{stats.totalCoaches || 0}</div>
                  <small className="text-body-secondary">Coaches</small>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="border rounded p-3 text-center h-100">
                  <CIcon icon={cilCheckCircle} size="xl" className="text-warning mb-2" />
                  <div className="fs-4 fw-bold">{stats.totalTshirtItems || 0}</div>
                  <small className="text-body-secondary">Playeras</small>
                </div>
              </CCol>
            </CRow>

            {/* Barra de progreso (solo si está en registro) */}
            {registration.status === 'accepted' && (
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="fw-semibold">Progreso del registro</span>
                  <span className="text-body-secondary">{registrationProgress}%</span>
                </div>
                <CProgress 
                  value={registrationProgress} 
                  color={registrationProgress >= 70 ? 'success' : 'warning'}
                  className="mb-2"
                  style={{ height: '10px' }}
                />
                <small className="text-body-secondary">
                  {registrationProgress < 70 
                    ? 'Completa al menos el 70% para poder enviar tu registro'
                    : '¡Listo! Puedes enviar tu registro'
                  }
                </small>
              </div>
            )}

            {/* Botón para completar registro */}
            {canSubmitRegistration && !isReadOnly && (
              <div className="border-top pt-4">
                <CButton 
                  color="primary" 
                  size="lg"
                  onClick={onCompleteRegistration}
                  disabled={isSubmitting}
                  className="w-100"
                >
                  {isSubmitting ? <CSpinner size="sm" className="me-2" /> : null}
                  <CIcon icon={cilCheckCircle} className="me-2" />
                  Finalizar y Enviar Registro
                </CButton>
                <small className="text-body-secondary d-block mt-2 text-center">
                  Una vez enviado, tu registro será revisado por el administrador
                </small>
              </div>
            )}

            {registration.status === 'registered' && (
              <CAlert color="primary" className="mb-0">
                <CIcon icon={cilClock} className="me-2" />
                <strong>Registro enviado.</strong> Está pendiente de validación por el administrador.
              </CAlert>
            )}

            {registration.status === 'completed' && (
              <CAlert color="success" className="mb-0">
                <CIcon icon={cilCheckCircle} className="me-2" />
                <strong>¡Registro completado!</strong> Tu participación ha sido confirmada.
              </CAlert>
            )}
          </>
        )}

        {/* Fechas importantes */}
        <div className="border-top pt-4 mt-4">
          <h6 className="text-body-secondary mb-3">Fechas importantes</h6>
          <CRow className="g-3">
            <CCol md={4}>
              <small className="text-body-secondary d-block">Inicio de registro</small>
              <strong>{formatDateTime(event.registrationStartDate)}</strong>
            </CCol>
            <CCol md={4}>
              <small className="text-body-secondary d-block">Fin de registro</small>
              <strong className={isDatePast(event.registrationEndDate) ? 'text-danger' : ''}>
                {formatDateTime(event.registrationEndDate)}
              </strong>
            </CCol>
            <CCol md={4}>
              <small className="text-body-secondary d-block">Límite de modificaciones</small>
              <strong className={updateDeadlinePassed ? 'text-danger' : ''}>
                {formatDateTime(event.updateDeadlineDate)}
              </strong>
            </CCol>
          </CRow>
        </div>
      </CCardBody>
    </CCard>
  )
}

EventHeader.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    bannerUrl: PropTypes.string,
    status: PropTypes.string,
    registrationStartDate: PropTypes.string,
    registrationEndDate: PropTypes.string,
    updateDeadlineDate: PropTypes.string,
    location: PropTypes.shape({
      name: PropTypes.string,
    }),
  }),
  registration: PropTypes.shape({
    status: PropTypes.string,
    acceptedAt: PropTypes.string,
    registeredAt: PropTypes.string,
  }),
  stats: PropTypes.shape({
    totalChoreographies: PropTypes.number,
    totalDancers: PropTypes.number,
    totalCoaches: PropTypes.number,
    totalTshirtItems: PropTypes.number,
  }),
  onAcceptInvitation: PropTypes.func,
  onRejectInvitation: PropTypes.func,
  onCompleteRegistration: PropTypes.func,
  isSubmitting: PropTypes.bool,
  isReadOnly: PropTypes.bool,
}

EventHeader.defaultProps = {
  event: null,
  registration: null,
  stats: null,
  onAcceptInvitation: () => {},
  onRejectInvitation: () => {},
  onCompleteRegistration: () => {},
  isSubmitting: false,
  isReadOnly: false,
}

export default EventHeader
