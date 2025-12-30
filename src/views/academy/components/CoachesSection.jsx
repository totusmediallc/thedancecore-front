import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilPeople,
  cilPlus,
  cilTrash,
  cilUser,
  cilWarning,
} from '@coreui/icons'

import { listCoaches } from '../../../services/coachesApi'
import {
  bulkAssignCoachesToEventAcademy,
  removeCoachFromEventAcademy,
} from '../../../services/eventAcademyCoachesApi'
import { HttpError } from '../../../services/httpClient'

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

const CoachesSection = ({
  eventId,
  academyId,
  assignedCoaches,
  onRefresh,
  isReadOnly,
}) => {
  // Estados
  const [availableCoaches, setAvailableCoaches] = useState([])
  const [loadingCoaches, setLoadingCoaches] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCoaches, setSelectedCoaches] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Cargar coaches disponibles de la academia
  useEffect(() => {
    const loadCoaches = async () => {
      if (!academyId) return
      setLoadingCoaches(true)
      try {
        const response = await listCoaches({ academyId })
        setAvailableCoaches(response?.data || response || [])
      } catch (err) {
        console.error('Error loading coaches:', err)
      } finally {
        setLoadingCoaches(false)
      }
    }
    loadCoaches()
  }, [academyId])

  // Obtener IDs de coaches asignados
  const assignedCoachIds = (assignedCoaches || []).map(
    (c) => c.coachId || c.coach?.id || c.id
  )

  // Abrir modal
  const handleOpenModal = useCallback(() => {
    setSelectedCoaches([...assignedCoachIds])
    setError(null)
    setShowModal(true)
  }, [assignedCoachIds])

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedCoaches([])
    setError(null)
  }, [])

  // Toggle selección de coach
  const toggleCoachSelection = useCallback((coachId) => {
    setSelectedCoaches((prev) => {
      if (prev.includes(coachId)) {
        return prev.filter((id) => id !== coachId)
      }
      return [...prev, coachId]
    })
  }, [])

  // Guardar asignación de coaches
  const handleSaveCoaches = async () => {
    setSubmitting(true)
    setError(null)

    try {
      // Coaches a eliminar
      const toRemove = assignedCoachIds.filter((id) => !selectedCoaches.includes(id))
      // Coaches a agregar
      const toAdd = selectedCoaches.filter((id) => !assignedCoachIds.includes(id))

      // Eliminar coaches
      for (const coachId of toRemove) {
        await removeCoachFromEventAcademy(coachId, academyId, eventId)
      }

      // Agregar coaches en bulk
      if (toAdd.length > 0) {
        await bulkAssignCoachesToEventAcademy({
          academyId,
          eventId,
          coachIds: toAdd,
        })
      }

      handleCloseModal()
      onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al asignar coaches'))
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar coach individual
  const handleRemoveCoach = async (coachId) => {
    if (!window.confirm('¿Estás seguro de quitar este coach del evento?')) {
      return
    }

    try {
      await removeCoachFromEventAcademy(coachId, academyId, eventId)
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al quitar el coach'))
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <CIcon icon={cilPeople} className="me-2" />
          <strong>Coaches Representantes</strong>
          <CBadge color="info" className="ms-2">{assignedCoaches?.length || 0}</CBadge>
        </div>
        {!isReadOnly && (
          <CButton 
            color="info" 
            size="sm" 
            onClick={handleOpenModal}
            disabled={loadingCoaches}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Gestionar Coaches
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {loadingCoaches ? (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        ) : (!assignedCoaches || assignedCoaches.length === 0) ? (
          <div className="text-center py-5 text-body-secondary">
            <CIcon icon={cilPeople} size="3xl" className="mb-3 opacity-50" />
            <p className="mb-0">No hay coaches asignados al evento</p>
            {!isReadOnly && (
              <p className="small">Haz clic en "Gestionar Coaches" para asignar representantes</p>
            )}
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-3">
            {assignedCoaches.map((item) => {
              const coach = item.coach || item
              return (
                <CCard key={coach.id} className="border" style={{ minWidth: '200px' }}>
                  <CCardBody className="p-3 d-flex align-items-center justify-content-between">
                    <div>
                      <div className="d-flex align-items-center">
                        <CIcon icon={cilUser} className="me-2 text-info" />
                        <strong>{coach.name}</strong>
                      </div>
                      <div className="small text-body-secondary">
                        {coach.mail || coach.phone || 'Sin contacto'}
                      </div>
                    </div>
                    {!isReadOnly && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCoach(coach.id)}
                        title="Quitar"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}
                  </CCardBody>
                </CCard>
              )
            })}
          </div>
        )}

        {/* Info sobre coaches */}
        {!loadingCoaches && availableCoaches.length === 0 && (
          <CAlert color="warning" className="mt-3 mb-0">
            <CIcon icon={cilWarning} className="me-2" />
            No hay coaches registrados en tu academia. Primero debes agregar coaches 
            en la sección de gestión de tu academia.
          </CAlert>
        )}
      </CCardBody>

      {/* Modal de asignación de coaches */}
      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>Asignar Coaches al Evento</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {error && (
            <CAlert color="danger" className="d-flex align-items-center">
              <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
              {error}
            </CAlert>
          )}

          {availableCoaches.length === 0 ? (
            <CAlert color="warning">
              <CIcon icon={cilWarning} className="me-2" />
              No hay coaches disponibles en tu academia.
            </CAlert>
          ) : (
            <>
              <p className="text-body-secondary mb-3">
                Selecciona los coaches que representarán a tu academia en este evento:
              </p>
              <CListGroup>
                {availableCoaches.map((coach) => (
                  <CListGroupItem
                    key={coach.id}
                    className="d-flex justify-content-between align-items-center cursor-pointer"
                    onClick={() => toggleCoachSelection(coach.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <CIcon icon={cilUser} className="me-2" />
                      <strong>{coach.name}</strong>
                      {coach.mail && (
                        <small className="text-body-secondary ms-2">{coach.mail}</small>
                      )}
                    </div>
                    <CIcon
                      icon={cilCheckCircle}
                      className={selectedCoaches.includes(coach.id) ? 'text-success' : 'text-body-secondary opacity-25'}
                    />
                  </CListGroupItem>
                ))}
              </CListGroup>
              <div className="mt-3 text-body-secondary">
                <strong>{selectedCoaches.length}</strong> coaches seleccionados
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseModal}>
            Cancelar
          </CButton>
          <CButton
            color="primary"
            onClick={handleSaveCoaches}
            disabled={submitting || availableCoaches.length === 0}
          >
            {submitting && <CSpinner size="sm" className="me-2" />}
            Guardar Asignación
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

CoachesSection.propTypes = {
  eventId: PropTypes.string.isRequired,
  academyId: PropTypes.string.isRequired,
  assignedCoaches: PropTypes.array,
  onRefresh: PropTypes.func,
  isReadOnly: PropTypes.bool,
}

CoachesSection.defaultProps = {
  assignedCoaches: [],
  onRefresh: () => {},
  isReadOnly: false,
}

export default CoachesSection
