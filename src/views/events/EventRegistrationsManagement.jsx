import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilChevronBottom,
  cilChevronRight,
  cilClock,
  cilBan,
  cilEnvelopeClosed,
  cilExternalLink,
  cilPeople,
  cilPlus,
  cilReload,
  cilSearch,
  cilSettings,
  cilTrash,
  cilWarning,
  cilXCircle,
  cilArrowThickFromLeft,
  cilCheckAlt,
  cilFilterX,
} from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCollapse,
  CFormInput,
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
  CProgress,
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

import { usePermissions } from '../../hooks/usePermissions'
import { listEvents } from '../../services/eventsApi'
import { listAcademies } from '../../services/academiesApi'
import {
  getEventAcademies,
  assignAcademyToEvent,
  bulkAssignAcademiesToEvent,
  removeAcademyFromEvent,
  validateEventRegistration,
  reactivateEventRegistration,
} from '../../services/eventAcademiesApi'
import { getRegistrationStats } from '../../services/academyEventRegistrationApi'
import { HttpError } from '../../services/httpClient'

// ==========================================
// Constantes
// ==========================================

const EVENT_STATUS_CONFIG = {
  draft: { color: 'secondary', label: 'Borrador', icon: cilClock },
  open: { color: 'success', label: 'Abierto', icon: cilCheckCircle },
  closed: { color: 'warning', label: 'Cerrado', icon: cilBan },
  finished: { color: 'dark', label: 'Finalizado', icon: cilCheckCircle },
}

const REGISTRATION_STATUS_CONFIG = {
  invited: { color: 'info', label: 'Invitada', icon: cilEnvelopeClosed, order: 1 },
  accepted: { color: 'primary', label: 'En Registro', icon: cilCheckAlt, order: 2 },
  rejected: { color: 'danger', label: 'Rechazada', icon: cilBan, order: 5 },
  registered: { color: 'warning', label: 'Pendiente Aprobación', icon: cilClock, order: 3 },
  completed: { color: 'success', label: 'Aprobada', icon: cilCheckCircle, order: 4 },
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'invited', label: 'Invitadas' },
  { value: 'accepted', label: 'En Registro' },
  { value: 'registered', label: 'Pendiente Aprobación' },
  { value: 'completed', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
]

const LIMIT_OPTIONS = [10, 20, 50]

// ==========================================
// Helpers
// ==========================================

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
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
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
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return '—'
  }
}

// ==========================================
// Sub-componente: Modal para invitar academias
// ==========================================

const InviteAcademiesModal = ({ visible, event, assignedIds, onClose, onSuccess }) => {
  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    if (!visible) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await listAcademies({ limit: 500 })
        setAcademies(response?.data || response || [])
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [visible])

  const availableAcademies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return academies
      .filter((a) => !assignedIds.has(a.id))
      .filter((a) => {
        if (!normalizedSearch) return true
        const haystack = [a.name, a.mail, a.contactPhoneNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
  }, [academies, assignedIds, search])

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allIds = availableAcademies.map((a) => a.id)
    setSelectedIds((prev) => {
      const allSelected = allIds.every((id) => prev.includes(id))
      return allSelected ? [] : allIds
    })
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    try {
      if (selectedIds.length === 1) {
        await assignAcademyToEvent({ eventId: event.id, academyId: selectedIds[0] })
      } else {
        await bulkAssignAcademiesToEvent({ eventId: event.id, academyIds: selectedIds })
      }
      setSelectedIds([])
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedIds([])
    setSearch('')
    onClose()
  }

  return (
    <CModal visible={visible} onClose={handleClose} size="lg" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>
          <CIcon icon={cilEnvelopeClosed} className="me-2" />
          Invitar Academias a: {event?.name}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {loading ? (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        ) : error ? (
          <CAlert color="danger">{error}</CAlert>
        ) : (
          <>
            <CInputGroup className="mb-3">
              <CInputGroupText>
                <CIcon icon={cilSearch} />
              </CInputGroupText>
              <CFormInput
                placeholder="Buscar academia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CInputGroup>

            {availableAcademies.length === 0 ? (
              <CAlert color="info">
                {search ? 'No se encontraron academias' : 'Todas las academias ya están invitadas'}
              </CAlert>
            ) : (
              <>
                <div className="d-flex justify-content-between mb-2">
                  <small className="text-body-secondary">
                    {availableAcademies.length} academia(s) disponible(s)
                  </small>
                  <CButton color="link" size="sm" onClick={handleSelectAll} className="p-0">
                    {availableAcademies.every((a) => selectedIds.includes(a.id))
                      ? 'Deseleccionar todas'
                      : 'Seleccionar todas'}
                  </CButton>
                </div>
                <div className="border rounded overflow-auto" style={{ maxHeight: '300px' }}>
                  <CTable hover small className="mb-0">
                    <CTableBody>
                      {availableAcademies.map((academy) => (
                        <CTableRow
                          key={academy.id}
                          onClick={() => handleToggle(academy.id)}
                          style={{ cursor: 'pointer' }}
                          className={selectedIds.includes(academy.id) ? 'table-primary' : ''}
                        >
                          <CTableDataCell style={{ width: 40 }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(academy.id)}
                              onChange={() => handleToggle(academy.id)}
                              className="form-check-input"
                            />
                          </CTableDataCell>
                          <CTableDataCell>
                            <div className="fw-medium">{academy.name}</div>
                            <small className="text-body-secondary">{academy.mail}</small>
                          </CTableDataCell>
                          <CTableDataCell className="text-body-secondary small">
                            {academy.colony?.municipality?.name}, {academy.colony?.municipality?.state?.name}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </>
            )}
          </>
        )}
      </CModalBody>
      <CModalFooter className="justify-content-between">
        <CButton color="secondary" variant="ghost" onClick={handleClose}>
          Cancelar
        </CButton>
        <CButton
          color="primary"
          onClick={handleSubmit}
          disabled={selectedIds.length === 0 || submitting}
        >
          {submitting ? (
            <CSpinner size="sm" className="me-2" />
          ) : (
            <CIcon icon={cilEnvelopeClosed} className="me-2" />
          )}
          Invitar {selectedIds.length > 0 && `(${selectedIds.length})`}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

// ==========================================
// Sub-componente: Fila expandible de evento
// ==========================================

const EventRow = ({ event, onRefresh }) => {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [inviteModalVisible, setInviteModalVisible] = useState(false)

  const eventStatusConfig = EVENT_STATUS_CONFIG[event.status] || EVENT_STATUS_CONFIG.draft

  const loadAcademies = useCallback(async () => {
    if (!event?.id) return
    setLoading(true)
    setError(null)
    try {
      const response = await getEventAcademies(event.id)
      const data = response?.data || response || []
      // Ordenar por estado (primero los que requieren acción)
      data.sort((a, b) => {
        const orderA = REGISTRATION_STATUS_CONFIG[a.status]?.order || 99
        const orderB = REGISTRATION_STATUS_CONFIG[b.status]?.order || 99
        return orderA - orderB
      })
      setAcademies(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [event?.id])

  useEffect(() => {
    if (expanded && academies.length === 0) {
      loadAcademies()
    }
  }, [expanded, loadAcademies, academies.length])

  const handleToggleExpand = () => {
    setExpanded((prev) => !prev)
  }

  const handleRefreshAcademies = () => {
    loadAcademies()
  }

  // Acciones sobre registros
  const handleApprove = async (academyId) => {
    if (!window.confirm('¿Aprobar este registro? La academia quedará confirmada.')) return
    setActionLoading(`approve-${academyId}`)
    try {
      await validateEventRegistration(academyId, event.id)
      await loadAcademies()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (academyId) => {
    if (!window.confirm('¿Reactivar este registro? La academia podrá editar su información.')) return
    setActionLoading(`reactivate-${academyId}`)
    try {
      await reactivateEventRegistration(academyId, event.id)
      await loadAcademies()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (academyId, academyName) => {
    if (!window.confirm(`¿Quitar la invitación a "${academyName}"? Esta acción no se puede deshacer.`)) return
    setActionLoading(`remove-${academyId}`)
    try {
      await removeAcademyFromEvent(academyId, event.id)
      await loadAcademies()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewRegistration = (academyId) => {
    navigate(`/academy/events/${event.id}?academyId=${academyId}`)
  }

  const filteredAcademies = useMemo(() => {
    if (!statusFilter) return academies
    return academies.filter((a) => a.status === statusFilter)
  }, [academies, statusFilter])

  const assignedIds = useMemo(() => new Set(academies.map((a) => a.academyId || a.academy?.id)), [academies])

  // Contadores por estado
  const statusCounts = useMemo(() => {
    const counts = { invited: 0, accepted: 0, registered: 0, completed: 0, rejected: 0 }
    academies.forEach((a) => {
      if (counts[a.status] !== undefined) counts[a.status]++
    })
    return counts
  }, [academies])

  return (
    <>
      {/* Fila principal del evento */}
      <CTableRow
        className="align-middle"
        style={{ cursor: 'pointer' }}
        onClick={handleToggleExpand}
      >
        <CTableDataCell style={{ width: 40 }}>
          <CIcon icon={expanded ? cilChevronBottom : cilChevronRight} />
        </CTableDataCell>
        <CTableDataCell>
          <div className="fw-semibold">{event.name}</div>
          <small className="text-body-secondary">
            <CIcon icon={cilCalendar} size="sm" className="me-1" />
            {formatDate(event.startDate)} - {formatDate(event.endDate)}
          </small>
        </CTableDataCell>
        <CTableDataCell>
          <CBadge color={eventStatusConfig.color}>
            <CIcon icon={eventStatusConfig.icon} size="sm" className="me-1" />
            {eventStatusConfig.label}
          </CBadge>
        </CTableDataCell>
        <CTableDataCell>
          <div className="d-flex flex-wrap gap-1">
            {statusCounts.registered > 0 && (
              <CBadge color="warning" title="Pendientes de aprobación">
                {statusCounts.registered} pendiente{statusCounts.registered > 1 ? 's' : ''}
              </CBadge>
            )}
            {statusCounts.completed > 0 && (
              <CBadge color="success" title="Aprobadas">
                {statusCounts.completed} aprobada{statusCounts.completed > 1 ? 's' : ''}
              </CBadge>
            )}
            {statusCounts.accepted > 0 && (
              <CBadge color="primary" title="En registro">
                {statusCounts.accepted} en registro
              </CBadge>
            )}
            {statusCounts.invited > 0 && (
              <CBadge color="info" title="Invitadas">
                {statusCounts.invited} invitada{statusCounts.invited > 1 ? 's' : ''}
              </CBadge>
            )}
            {academies.length === 0 && !loading && (
              <span className="text-body-secondary small">Sin academias</span>
            )}
          </div>
        </CTableDataCell>
        <CTableDataCell className="text-end" onClick={(e) => e.stopPropagation()}>
          <CButton
            color="primary"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setInviteModalVisible(true)
            }}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Invitar
          </CButton>
        </CTableDataCell>
      </CTableRow>

      {/* Fila expandida con academias */}
      <CTableRow>
        <CTableDataCell colSpan={5} className="p-0 border-0">
          <CCollapse visible={expanded}>
            <div className="bg-body-tertiary p-3">
              {loading ? (
                <div className="text-center py-3">
                  <CSpinner size="sm" color="primary" />
                  <span className="ms-2">Cargando academias...</span>
                </div>
              ) : error ? (
                <CAlert color="danger" className="mb-0">{error}</CAlert>
              ) : academies.length === 0 ? (
                <CAlert color="info" className="mb-0">
                  No hay academias invitadas a este evento.
                  <CButton
                    color="primary"
                    size="sm"
                    className="ms-2"
                    onClick={() => setInviteModalVisible(true)}
                  >
                    Invitar ahora
                  </CButton>
                </CAlert>
              ) : (
                <>
                  {/* Filtros y acciones */}
                  <CRow className="mb-3 align-items-center g-2">
                    <CCol xs={12} md={4}>
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
                    <CCol xs={12} md={8} className="text-md-end">
                      <CButton
                        color="light"
                        size="sm"
                        onClick={handleRefreshAcademies}
                        className="me-2"
                      >
                        <CIcon icon={cilReload} />
                      </CButton>
                      <small className="text-body-secondary">
                        {filteredAcademies.length} de {academies.length} academia(s)
                      </small>
                    </CCol>
                  </CRow>

                  {/* Tabla de academias */}
                  <div className="border rounded bg-white">
                    <CTable hover small className="mb-0" responsive>
                      <CTableHead className="bg-body-secondary">
                        <CTableRow>
                          <CTableHeaderCell>Academia</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 150 }}>Estado</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 120 }}>Coreografías</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 100 }}>Bailarines</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 200 }}>Última Actualización</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 220 }} className="text-end">
                            Acciones
                          </CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {filteredAcademies.map((item) => {
                          const academy = item.academy || {}
                          const academyId = item.academyId || academy.id
                          const statusConfig = REGISTRATION_STATUS_CONFIG[item.status] || REGISTRATION_STATUS_CONFIG.invited
                          const isActionLoading = actionLoading?.includes(academyId)

                          return (
                            <CTableRow key={academyId} className="align-middle">
                              <CTableDataCell>
                                <div className="fw-medium">{academy.name || 'Academia'}</div>
                                <small className="text-body-secondary">{academy.mail}</small>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={statusConfig.color}>
                                  <CIcon icon={statusConfig.icon} size="sm" className="me-1" />
                                  {statusConfig.label}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                <span className="text-body-secondary">
                                  {item.stats?.totalChoreographies ?? '—'}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell>
                                <span className="text-body-secondary">
                                  {item.stats?.totalDancers ?? '—'}
                                </span>
                              </CTableDataCell>
                              <CTableDataCell>
                                <small className="text-body-secondary">
                                  {formatDateTime(item.updatedAt || item.createdAt)}
                                </small>
                              </CTableDataCell>
                              <CTableDataCell className="text-end">
                                <CButtonGroup size="sm">
                                  {/* Ver registro */}
                                  <CTooltip content="Ver registro">
                                    <CButton
                                      color="primary"
                                      variant="outline"
                                      onClick={() => handleViewRegistration(academyId)}
                                    >
                                      <CIcon icon={cilExternalLink} />
                                    </CButton>
                                  </CTooltip>

                                  {/* Aprobar (solo si está en registered) */}
                                  {item.status === 'registered' && (
                                    <CTooltip content="Aprobar registro">
                                      <CButton
                                        color="success"
                                        onClick={() => handleApprove(academyId)}
                                        disabled={isActionLoading}
                                      >
                                        {actionLoading === `approve-${academyId}` ? (
                                          <CSpinner size="sm" />
                                        ) : (
                                          <CIcon icon={cilCheckCircle} />
                                        )}
                                      </CButton>
                                    </CTooltip>
                                  )}

                                  {/* Reactivar (si está registered o completed) */}
                                  {['registered', 'completed'].includes(item.status) && (
                                    <CTooltip content="Reactivar para edición">
                                      <CButton
                                        color="warning"
                                        onClick={() => handleReactivate(academyId)}
                                        disabled={isActionLoading}
                                      >
                                        {actionLoading === `reactivate-${academyId}` ? (
                                          <CSpinner size="sm" />
                                        ) : (
                                          <CIcon icon={cilArrowThickFromLeft} />
                                        )}
                                      </CButton>
                                    </CTooltip>
                                  )}

                                  {/* Quitar invitación */}
                                  <CTooltip content="Quitar invitación">
                                    <CButton
                                      color="danger"
                                      variant="outline"
                                      onClick={() => handleRemove(academyId, academy.name)}
                                      disabled={isActionLoading}
                                    >
                                      {actionLoading === `remove-${academyId}` ? (
                                        <CSpinner size="sm" />
                                      ) : (
                                        <CIcon icon={cilTrash} />
                                      )}
                                    </CButton>
                                  </CTooltip>
                                </CButtonGroup>
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })}
                      </CTableBody>
                    </CTable>
                  </div>
                </>
              )}
            </div>
          </CCollapse>
        </CTableDataCell>
      </CTableRow>

      {/* Modal para invitar academias */}
      <InviteAcademiesModal
        visible={inviteModalVisible}
        event={event}
        assignedIds={assignedIds}
        onClose={() => setInviteModalVisible(false)}
        onSuccess={() => {
          loadAcademies()
          onRefresh?.()
        }}
      />
    </>
  )
}

// ==========================================
// Componente Principal
// ==========================================

const EventRegistrationsManagement = () => {
  const { isAdmin } = usePermissions()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtros y paginación
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page,
        limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      }
      const response = await listEvents(params)
      const data = response?.data || response || []
      setEvents(Array.isArray(data) ? data : [])
      setTotal(response?.meta?.total || response?.total || data.length)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, statusFilter])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value))
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit) || 1

  // Redirigir si no es admin
  if (!isAdmin) {
    return (
      <CAlert color="danger">
        <CIcon icon={cilWarning} className="me-2" />
        No tienes permisos para acceder a esta sección.
      </CAlert>
    )
  }

  return (
    <>
      <CRow className="mb-4 align-items-center">
        <CCol>
          <h4 className="mb-0">
            <CIcon icon={cilSettings} className="me-2" />
            Gestión de Registros por Evento
          </h4>
          <small className="text-body-secondary">
            Administra las academias invitadas y sus estados de registro
          </small>
        </CCol>
        <CCol xs="auto">
          <CButton color="light" onClick={loadEvents} disabled={loading}>
            <CIcon icon={cilReload} className={loading ? 'animate-spin' : ''} />
          </CButton>
        </CCol>
      </CRow>

      {/* Filtros */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3 align-items-end">
            <CCol xs={12} md={4}>
              <label className="form-label small text-body-secondary">Buscar evento</label>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Nombre del evento..."
                  value={search}
                  onChange={handleSearch}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={12} md={3}>
              <label className="form-label small text-body-secondary">Estado del evento</label>
              <CFormSelect value={statusFilter} onChange={handleStatusFilter}>
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="open">Abierto</option>
                <option value="closed">Cerrado</option>
                <option value="finished">Finalizado</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={2}>
              <label className="form-label small text-body-secondary">Por página</label>
              <CFormSelect value={limit} onChange={handleLimitChange}>
                {LIMIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={3} className="text-md-end">
              {(search || statusFilter) && (
                <CButton
                  color="secondary"
                  variant="ghost"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('')
                    setPage(1)
                  }}
                >
                  <CIcon icon={cilFilterX} className="me-1" />
                  Limpiar filtros
                </CButton>
              )}
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
        <CAlert color="danger">
          <CIcon icon={cilWarning} className="me-2" />
          {error}
        </CAlert>
      )}

      {/* Sin resultados */}
      {!loading && !error && events.length === 0 && (
        <CCard>
          <CCardBody className="text-center py-5">
            <CIcon icon={cilCalendar} size="3xl" className="text-body-secondary opacity-50 mb-3" />
            <h5 className="text-body-secondary">No hay eventos</h5>
            <p className="text-body-secondary small">
              {search || statusFilter
                ? 'No se encontraron eventos con los filtros aplicados'
                : 'Crea un evento para comenzar a invitar academias'}
            </p>
          </CCardBody>
        </CCard>
      )}

      {/* Tabla de eventos */}
      {!loading && !error && events.length > 0 && (
        <CCard>
          <CCardBody className="p-0">
            <CTable hover className="mb-0" responsive>
              <CTableHead className="bg-body-secondary">
                <CTableRow>
                  <CTableHeaderCell style={{ width: 40 }}></CTableHeaderCell>
                  <CTableHeaderCell>Evento</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 120 }}>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Academias</CTableHeaderCell>
                  <CTableHeaderCell style={{ width: 120 }} className="text-end">
                    Acciones
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {events.map((event) => (
                  <EventRow key={event.id} event={event} onRefresh={loadEvents} />
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>

          {/* Paginación */}
          {totalPages > 1 && (
            <CCardBody className="border-top d-flex justify-content-between align-items-center">
              <small className="text-body-secondary">
                Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} eventos
              </small>
              <CPagination className="mb-0">
                <CPaginationItem
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  «
                </CPaginationItem>
                <CPaginationItem
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </CPaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const pageNum = start + i
                  if (pageNum > totalPages) return null
                  return (
                    <CPaginationItem
                      key={pageNum}
                      active={pageNum === page}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </CPaginationItem>
                  )
                })}
                <CPaginationItem
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
            </CCardBody>
          )}
        </CCard>
      )}
    </>
  )
}

export default EventRegistrationsManagement
