import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCalendar,
  cilReload,
  cilWarning,
} from '@coreui/icons'
import {
  CAlert,
  CBreadcrumb,
  CBreadcrumbItem,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormSelect,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
} from '@coreui/react'

import { usePermissions } from '../../hooks/usePermissions'
import { listAcademies } from '../../services/academiesApi'
import { getRegistrationSummary } from '../../services/academyEventRegistrationApi'
import { getEventAcademyChoreographies } from '../../services/choreographiesApi'
import { getChoreographyDancers } from '../../services/choreographyDancersApi'
import { listDancers } from '../../services/dancersApi'
import {
  acceptEventInvitation,
  rejectEventInvitation,
  completeEventRegistration,
  validateEventRegistration,
  reactivateEventRegistration,
} from '../../services/eventAcademiesApi'
import { getEventAcademyCoaches } from '../../services/eventAcademyCoachesApi'
import { HttpError } from '../../services/httpClient'

import {
  EventHeader,
  ChoreographiesSection,
  DancersSection,
  CoachesSection,
  TshirtRegistrationSection,
} from './components'

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

const AcademyEventRegistration = () => {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAdmin, academyId: userAcademyId, academy: userAcademy } = usePermissions()

  // Obtener academyId de query params (cuando admin viene de gestión de registros)
  const queryAcademyId = searchParams.get('academyId')

  // Estados principales
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Estado para selección de academia (admin)
  const [academies, setAcademies] = useState([])
  const [selectedAcademyId, setSelectedAcademyId] = useState(queryAcademyId || '')
  const [loadingAcademies, setLoadingAcademies] = useState(false)

  // Datos del registro
  const [summaryData, setSummaryData] = useState(null)
  const [choreographies, setChoreographies] = useState([])
  const [coaches, setCoaches] = useState([])
  const [dancers, setDancers] = useState([])

  // Tab activa
  const [activeTab, setActiveTab] = useState('choreographies')

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
        // Si viene un academyId por query, usarlo; si no, usar el del usuario
        if (!selectedAcademyId && !queryAcademyId && userAcademyId) {
          setSelectedAcademyId(userAcademyId)
        }
      } catch (err) {
        console.error('Error loading academies:', err)
      } finally {
        setLoadingAcademies(false)
      }
    }
    loadAcademies()
  }, [isAdmin, userAcademyId, selectedAcademyId, queryAcademyId])

  // Cargar datos del registro
  const loadData = useCallback(async () => {
    if (!eventId || !effectiveAcademyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Cargar resumen, coreografías, coaches y bailarines en paralelo
      const [summaryResponse, choreographiesResponse, coachesResponse, dancersResponse] = await Promise.all([
        getRegistrationSummary(eventId, effectiveAcademyId),
        getEventAcademyChoreographies(eventId, effectiveAcademyId),
        getEventAcademyCoaches(eventId, effectiveAcademyId),
        listDancers({ academyId: effectiveAcademyId, limit: 500 }),
      ])

      setSummaryData(summaryResponse)
      setDancers(dancersResponse?.data || dancersResponse || [])
      
      // Los coaches pueden venir como array directo o con .data
      setCoaches(coachesResponse?.data || coachesResponse || [])
      
      // Las coreografías pueden venir como array directo o con .data
      const rawChoreographies = choreographiesResponse?.data || choreographiesResponse || []
      
      // Enriquecer cada coreografía con sus bailarines asignados
      // El backend no incluye los bailarines en la respuesta de coreografías
      const enrichedChoreographies = await Promise.all(
        rawChoreographies.map(async (choreo) => {
          try {
            const dancersData = await getChoreographyDancers(choreo.id)
            // La respuesta puede ser un array directo o tener .data
            const choreoDancers = dancersData?.data || dancersData || []
            return { ...choreo, dancers: choreoDancers }
          } catch (err) {
            console.warn(`Error loading dancers for choreography ${choreo.id}:`, err)
            return { ...choreo, dancers: [] }
          }
        })
      )
      
      setChoreographies(enrichedChoreographies)
    } catch (err) {
      console.error('Error loading data:', err)
      setError(getErrorMessage(err, 'Error al cargar los datos del registro'))
    } finally {
      setLoading(false)
    }
  }, [eventId, effectiveAcademyId])

  // Cargar datos al montar o cambiar dependencias
  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  // Refrescar datos
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Aceptar invitación
  const handleAcceptInvitation = useCallback(async () => {
    if (!effectiveAcademyId || !eventId) return
    
    if (!window.confirm('¿Estás seguro de aceptar esta invitación? Podrás comenzar tu registro.')) {
      return
    }

    setSubmitting(true)
    try {
      await acceptEventInvitation(effectiveAcademyId, eventId)
      handleRefresh()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al aceptar la invitación'))
    } finally {
      setSubmitting(false)
    }
  }, [effectiveAcademyId, eventId, handleRefresh])

  // Rechazar invitación
  const handleRejectInvitation = useCallback(async () => {
    if (!effectiveAcademyId || !eventId) return
    
    if (!window.confirm('¿Estás seguro de rechazar esta invitación? Esta acción no se puede deshacer.')) {
      return
    }

    setSubmitting(true)
    try {
      await rejectEventInvitation(effectiveAcademyId, eventId)
      handleRefresh()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al rechazar la invitación'))
    } finally {
      setSubmitting(false)
    }
  }, [effectiveAcademyId, eventId, handleRefresh])

  // Completar registro
  const handleCompleteRegistration = useCallback(async () => {
    if (!effectiveAcademyId || !eventId) return
    
    const confirmMessage = '¿Estás seguro de enviar tu registro?\n\nUna vez enviado, será revisado por el administrador y no podrás hacer más cambios.'
    if (!window.confirm(confirmMessage)) {
      return
    }

    setSubmitting(true)
    try {
      await completeEventRegistration(effectiveAcademyId, eventId)
      handleRefresh()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al completar el registro'))
    } finally {
      setSubmitting(false)
    }
  }, [effectiveAcademyId, eventId, handleRefresh])

  // Validar/aprobar registro (Admin)
  const handleValidateRegistration = useCallback(async () => {
    if (!effectiveAcademyId || !eventId) return
    
    const confirmMessage = '¿Estás seguro de aprobar este registro?\n\nEl estado cambiará a "Completado".'
    if (!window.confirm(confirmMessage)) {
      return
    }

    setSubmitting(true)
    try {
      await validateEventRegistration(effectiveAcademyId, eventId)
      handleRefresh()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al aprobar el registro'))
    } finally {
      setSubmitting(false)
    }
  }, [effectiveAcademyId, eventId, handleRefresh])

  // Reactivar registro para permitir ediciones (Admin)
  const handleReactivateRegistration = useCallback(async () => {
    if (!effectiveAcademyId || !eventId) return
    
    const confirmMessage = '¿Estás seguro de reactivar este registro?\n\nLa academia podrá editar su información nuevamente y deberá volver a enviar el registro.'
    if (!window.confirm(confirmMessage)) {
      return
    }

    setSubmitting(true)
    try {
      await reactivateEventRegistration(effectiveAcademyId, eventId)
      handleRefresh()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al reactivar el registro'))
    } finally {
      setSubmitting(false)
    }
  }, [effectiveAcademyId, eventId, handleRefresh])

  // Determinar si es solo lectura
  const isReadOnly = useMemo(() => {
    if (!summaryData?.registration) return true
    const { status } = summaryData.registration
    const eventStatus = summaryData.event?.status
    
    // Es solo lectura si:
    // - El estado de participación es rejected, registered o completed
    if (['rejected', 'registered', 'completed'].includes(status)) return true
    
    // Para usuarios de academia: solo pueden editar si el evento está abierto
    // Para admin: puede editar siempre (para ayudar a configurar)
    if (!isAdmin && eventStatus !== 'open') return true
    
    // Si la fecha límite de modificación ya pasó (solo aplica a academias)
    const updateDeadline = summaryData.event?.updateDeadlineDate
    if (!isAdmin && updateDeadline && new Date(updateDeadline) < new Date()) return true
    
    return false
  }, [summaryData, isAdmin])

  // Mensaje de advertencia para estado del evento
  const eventStatusWarning = useMemo(() => {
    if (!summaryData?.event) return null
    const eventStatus = summaryData.event.status
    
    if (eventStatus === 'draft') {
      return isAdmin 
        ? 'El evento está en borrador. Como admin puedes configurar el registro.'
        : 'El evento aún no está abierto para registro. Espera a que el administrador lo abra.'
    }
    if (eventStatus === 'closed') {
      return 'El registro para este evento está cerrado.'
    }
    if (eventStatus === 'finished') {
      return 'Este evento ya finalizó.'
    }
    return null
  }, [summaryData, isAdmin])

  // Datos extraídos del summary
  const event = summaryData?.event
  const registration = summaryData?.registration
  const stats = summaryData?.stats
  // choreographies y coaches vienen del estado separado, no del summary
  const order = summaryData?.order

  // Obtener nombre de academia para mostrar
  const academyName = useMemo(() => {
    if (summaryData?.academy?.name) return summaryData.academy.name
    if (userAcademy?.name) return userAcademy.name
    const found = academies.find((a) => a.id === effectiveAcademyId)
    return found?.name || 'Academia'
  }, [summaryData, userAcademy, academies, effectiveAcademyId])

  return (
    <>
      {/* Breadcrumb */}
      <CBreadcrumb className="mb-4">
        <CBreadcrumbItem href="#" onClick={(e) => { e.preventDefault(); navigate('/academy/events') }}>
          <CIcon icon={cilCalendar} className="me-1" />
          Mis Eventos
        </CBreadcrumbItem>
        <CBreadcrumbItem active>
          {event?.name || 'Registro a Evento'}
        </CBreadcrumbItem>
      </CBreadcrumb>

      {/* Header con botones de acción */}
      <CRow className="mb-4 align-items-center">
        <CCol>
          <div className="d-flex align-items-center gap-2">
            <CButton
              color="secondary"
              variant="ghost"
              onClick={() => navigate('/academy/events')}
            >
              <CIcon icon={cilArrowLeft} className="me-1" />
              Volver
            </CButton>
            <h4 className="mb-0">
              Registro: {academyName}
            </h4>
          </div>
        </CCol>
        <CCol xs="auto">
          <CButton
            color="light"
            onClick={handleRefresh}
            disabled={loading}
          >
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

      {/* Estado de carga */}
      {loading && (
        <CCard>
          <CCardBody className="text-center py-5">
            <CSpinner color="primary" />
            <p className="mt-3 text-body-secondary">Cargando información del registro...</p>
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
          Selecciona una academia para ver su registro al evento.
        </CAlert>
      )}

      {/* Sin datos de registro */}
      {!loading && !error && effectiveAcademyId && !summaryData && (
        <CAlert color="warning">
          <CIcon icon={cilWarning} className="me-2" />
          No se encontró información de registro para esta academia en este evento.
          Es posible que la academia no haya sido invitada.
        </CAlert>
      )}

      {/* Contenido principal */}
      {!loading && !error && summaryData && (
        <>
          {/* Advertencia de estado del evento */}
          {eventStatusWarning && (
            <CAlert color={isAdmin ? 'info' : 'warning'} className="mb-4">
              <CIcon icon={cilWarning} className="me-2" />
              {eventStatusWarning}
            </CAlert>
          )}

          {/* Header del evento */}
          <EventHeader
            event={event}
            registration={registration}
            stats={stats}
            onAcceptInvitation={handleAcceptInvitation}
            onRejectInvitation={handleRejectInvitation}
            onCompleteRegistration={handleCompleteRegistration}
            onValidateRegistration={handleValidateRegistration}
            onReactivateRegistration={handleReactivateRegistration}
            isSubmitting={submitting}
            isReadOnly={isReadOnly}
            isAdmin={isAdmin}
          />

          {/* Tabs de contenido (solo si aceptó la invitación) */}
          {['accepted', 'registered', 'completed'].includes(registration?.status) && (
            <>
              <CNav variant="tabs" className="mb-4">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'choreographies'}
                    onClick={() => setActiveTab('choreographies')}
                    style={{ cursor: 'pointer' }}
                  >
                    Coreografías
                    {stats?.totalChoreographies > 0 && (
                      <span className="ms-2 badge bg-primary">{stats.totalChoreographies}</span>
                    )}
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'dancers'}
                    onClick={() => setActiveTab('dancers')}
                    style={{ cursor: 'pointer' }}
                  >
                    Bailarines
                    {stats?.totalDancers > 0 && (
                      <span className="ms-2 badge bg-success">{stats.totalDancers}</span>
                    )}
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'coaches'}
                    onClick={() => setActiveTab('coaches')}
                    style={{ cursor: 'pointer' }}
                  >
                    Coaches
                    {stats?.totalCoaches > 0 && (
                      <span className="ms-2 badge bg-info">{stats.totalCoaches}</span>
                    )}
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'tshirts'}
                    onClick={() => setActiveTab('tshirts')}
                    style={{ cursor: 'pointer' }}
                  >
                    Playeras
                    {stats?.totalTshirtItems > 0 && (
                      <span className="ms-2 badge bg-warning">{stats.totalTshirtItems}</span>
                    )}
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent>
                <CTabPane visible={activeTab === 'choreographies'}>
                  <ChoreographiesSection
                    eventId={eventId}
                    academyId={effectiveAcademyId}
                    choreographies={choreographies}
                    dancers={dancers}
                    onRefresh={handleRefresh}
                    isReadOnly={isReadOnly}
                  />
                </CTabPane>

                <CTabPane visible={activeTab === 'dancers'}>
                  <DancersSection
                    academyId={effectiveAcademyId}
                    dancers={dancers}
                    choreographies={choreographies}
                    onRefresh={handleRefresh}
                    isReadOnly={isReadOnly}
                  />
                </CTabPane>

                <CTabPane visible={activeTab === 'coaches'}>
                  <CoachesSection
                    eventId={eventId}
                    academyId={effectiveAcademyId}
                    assignedCoaches={coaches}
                    onRefresh={handleRefresh}
                    isReadOnly={isReadOnly}
                  />
                </CTabPane>

                <CTabPane visible={activeTab === 'tshirts'}>
                  <TshirtRegistrationSection
                    eventId={eventId}
                    academyId={effectiveAcademyId}
                    order={order}
                    onRefresh={handleRefresh}
                    isReadOnly={isReadOnly}
                  />
                </CTabPane>
              </CTabContent>
            </>
          )}
        </>
      )}
    </>
  )
}

export default AcademyEventRegistration
