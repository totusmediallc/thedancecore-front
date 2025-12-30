import React, { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilLink,
  cilMusicNote,
  cilPencil,
  cilPlus,
  cilUser,
  cilWarning,
  cilInfo,
} from '@coreui/icons'

import { createDancer, updateDancer, unlinkDancerFromAcademy } from '../../../services/dancersApi'
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

const toInputDateValue = (value) => {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

// Validación simple de CURP
const validateCurp = (curp) => {
  if (!curp) return false
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i
  return curpRegex.test(curp)
}

/**
 * DancersSection - Muestra bailarines asignados a coreografías de un evento
 * 
 * En el contexto de un evento, esta sección muestra:
 * - Bailarines que están asignados a al menos una coreografía del evento
 * - Las coreografías en las que participa cada bailarín
 * 
 * También permite:
 * - Agregar nuevos bailarines (se agregarán a la base de la academia)
 * - La asignación a coreografías se hace desde el modal de coreografía
 */
const DancersSection = ({
  academyId,
  dancers,           // Todos los bailarines de la academia
  choreographies,    // Coreografías del evento (con sus bailarines asignados)
  onRefresh,
  isReadOnly,
}) => {
  // Estados de modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedDancer, setSelectedDancer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [wasLinked, setWasLinked] = useState(false)

  // Estados de formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    curp: '',
  })

  // Estados de validación
  const [curpValid, setCurpValid] = useState(null)

  // Calcular bailarines asignados a coreografías del evento
  // y las coreografías en las que participa cada uno
  const assignedDancersWithChoreographies = useMemo(() => {
    if (!choreographies || choreographies.length === 0) return []
    
    // Crear un mapa de bailarín -> coreografías
    const dancerChoreographiesMap = new Map()
    
    choreographies.forEach((choreo) => {
      const choreodancers = choreo.dancers || []
      choreodancers.forEach((d) => {
        const dancerId = d.dancerId || d.dancer?.id || d.id
        const dancerData = d.dancer || dancers.find((dn) => dn.id === dancerId) || d
        
        if (!dancerChoreographiesMap.has(dancerId)) {
          dancerChoreographiesMap.set(dancerId, {
            dancer: dancerData,
            choreographies: []
          })
        }
        dancerChoreographiesMap.get(dancerId).choreographies.push({
          id: choreo.id,
          name: choreo.name
        })
      })
    })
    
    return Array.from(dancerChoreographiesMap.values())
  }, [choreographies, dancers])

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      birthDate: '',
      curp: '',
    })
    setSelectedDancer(null)
    setError(null)
    setWasLinked(false)
    setCurpValid(null)
  }, [])

  // Abrir modal para crear
  const handleOpenCreateModal = useCallback(() => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }, [resetForm])

  // Abrir modal para editar
  const handleOpenEditModal = useCallback((dancer) => {
    setSelectedDancer(dancer)
    setFormData({
      name: dancer.name || '',
      email: dancer.email || '',
      phone: dancer.phone || '',
      birthDate: toInputDateValue(dancer.birthDate),
      curp: dancer.curp || '',
    })
    setModalMode('edit')
    setShowModal(true)
    setCurpValid(validateCurp(dancer.curp))
  }, [])

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    resetForm()
  }, [resetForm])

  // Manejar cambios en formulario
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Validar CURP en tiempo real
    if (name === 'curp') {
      setCurpValid(value ? validateCurp(value) : null)
    }
  }, [])

  // Guardar bailarín
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setWasLinked(false)

    try {
      const payload = {
        name: formData.name,
        curp: formData.curp.toUpperCase(),
        birthDate: formData.birthDate,
        ...(formData.email && { email: formData.email }),
        ...(formData.phone && { phone: formData.phone }),
        academyId,
      }

      if (modalMode === 'create') {
        // Usar create-or-link para bailarines nuevos
        const response = await createDancer(payload)
        if (response?.wasLinked) {
          setWasLinked(true)
          // Mostrar mensaje y no cerrar el modal inmediatamente
          setTimeout(() => {
            handleCloseModal()
            onRefresh?.()
          }, 2000)
          return
        }
      } else {
        await updateDancer(selectedDancer.id, payload)
      }

      handleCloseModal()
      onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Desvincular bailarín de la academia (no lo elimina del sistema)
  const handleUnlink = async (dancerId, dancerName) => {
    if (!window.confirm(`¿Estás seguro de quitar a "${dancerName}" de tu academia?\n\nEl bailarín no será eliminado del sistema, solo se quitará de tu lista. También se quitará de las coreografías donde esté asignado en este evento.`)) {
      return
    }

    try {
      const response = await unlinkDancerFromAcademy(dancerId, academyId)
      // Mostrar mensaje del backend si existe
      if (response?.message) {
        alert(response.message)
      }
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al quitar el bailarín'))
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

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <CIcon icon={cilUser} className="me-2" />
          <strong>Bailarines en este Evento</strong>
          <CBadge color="success" className="ms-2">{assignedDancersWithChoreographies.length}</CBadge>
        </div>
        {!isReadOnly && (
          <CButton color="success" size="sm" onClick={handleOpenCreateModal}>
            <CIcon icon={cilPlus} className="me-1" />
            Agregar Bailarín a Academia
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {/* Mensaje informativo */}
        <CAlert color="info" className="mb-3 small">
          <CIcon icon={cilInfo} className="me-2" />
          Aquí se muestran los bailarines asignados a las coreografías de este evento.
          Para asignar bailarines a una coreografía, edita la coreografía en la pestaña "Coreografías".
        </CAlert>
        
        {assignedDancersWithChoreographies.length === 0 ? (
          <div className="text-center py-5 text-body-secondary">
            <CIcon icon={cilUser} size="3xl" className="mb-3 opacity-50" />
            <p className="mb-0">No hay bailarines asignados a coreografías</p>
            <p className="small">
              Ve a la pestaña "Coreografías" y asigna bailarines al crear o editar una coreografía
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <CTable hover align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>CURP</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Edad</CTableHeaderCell>
                  <CTableHeaderCell>Participa en</CTableHeaderCell>
                  {!isReadOnly && (
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  )}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {assignedDancersWithChoreographies.map(({ dancer, choreographies: dancerChoreos }) => {
                  // Si el bailarín tiene más de una academia, mostrar indicador
                  const isShared = dancer.academies && dancer.academies.length > 1
                  return (
                  <CTableRow key={dancer.id}>
                    <CTableDataCell>
                      <div className="d-flex align-items-center">
                        <div className="fw-semibold">{dancer.name}</div>
                        {isShared && (
                          <CBadge 
                            color="info" 
                            className="ms-2" 
                            title={`Vinculado a ${dancer.academies.length} academias`}
                          >
                            <CIcon icon={cilLink} size="sm" />
                          </CBadge>
                        )}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <code className="small">{dancer.curp}</code>
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      {calculateAge(dancer.birthDate) !== null ? (
                        <CBadge color="light" textColor="dark">
                          {calculateAge(dancer.birthDate)} años
                        </CBadge>
                      ) : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-wrap gap-1">
                        {dancerChoreos.map((choreo) => (
                          <CBadge key={choreo.id} color="primary" className="small">
                            <CIcon icon={cilMusicNote} size="sm" className="me-1" />
                            {choreo.name}
                          </CBadge>
                        ))}
                      </div>
                    </CTableDataCell>
                    {!isReadOnly && (
                      <CTableDataCell className="text-end">
                        <CButton
                          color="primary"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(dancer)}
                          title="Editar datos del bailarín"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </div>
        )}
      </CCardBody>

      {/* Modal de crear/editar bailarín */}
      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            {modalMode === 'create' ? 'Nuevo Bailarín' : 'Editar Bailarín'}
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            {error && (
              <CAlert color="danger" className="d-flex align-items-center">
                <CIcon icon={cilWarning} className="flex-shrink-0 me-2" />
                {error}
              </CAlert>
            )}

            {wasLinked && (
              <CAlert color="success" className="d-flex align-items-center">
                <CIcon icon={cilInfo} className="flex-shrink-0 me-2" />
                <div>
                  <strong>¡Bailarín vinculado!</strong>
                  <p className="mb-0 small">
                    Este bailarín ya estaba registrado en el sistema y ha sido vinculado a tu academia.
                  </p>
                </div>
              </CAlert>
            )}

            {modalMode === 'create' && (
              <CAlert color="info" className="d-flex align-items-start">
                <CIcon icon={cilInfo} className="flex-shrink-0 me-2 mt-1" />
                <div className="small">
                  <strong>Nota:</strong> Si el CURP ya existe en el sistema, el bailarín será 
                  vinculado automáticamente a tu academia sin crear un duplicado.
                </div>
              </CAlert>
            )}

            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel htmlFor="name">Nombre completo *</CFormLabel>
                <CFormInput
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nombre completo del bailarín"
                  required
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="curp">CURP *</CFormLabel>
                <CFormInput
                  id="curp"
                  name="curp"
                  value={formData.curp}
                  onChange={handleInputChange}
                  placeholder="AAAA000000HAAAAA00"
                  maxLength={18}
                  required
                  className={curpValid === false ? 'is-invalid' : curpValid === true ? 'is-valid' : ''}
                  style={{ textTransform: 'uppercase' }}
                />
                {curpValid === false && (
                  <div className="invalid-feedback">
                    El formato del CURP no es válido
                  </div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="birthDate">Fecha de nacimiento *</CFormLabel>
                <CFormInput
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  required
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="email">Correo electrónico</CFormLabel>
                <CFormInput
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@ejemplo.com"
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="phone">Teléfono</CFormLabel>
                <CFormInput
                  id="phone"
                  name="phone"
                  type="tel"
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
            <CButton type="submit" color="primary" disabled={submitting || curpValid === false}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              {modalMode === 'create' ? 'Registrar Bailarín' : 'Guardar Cambios'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CCard>
  )
}

DancersSection.propTypes = {
  academyId: PropTypes.string.isRequired,
  dancers: PropTypes.array,
  choreographies: PropTypes.array,
  onRefresh: PropTypes.func,
  isReadOnly: PropTypes.bool,
}

DancersSection.defaultProps = {
  dancers: [],
  choreographies: [],
  onRefresh: () => {},
  isReadOnly: false,
}

export default DancersSection
