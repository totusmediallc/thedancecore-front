import React, { useCallback, useState } from 'react'
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
  cilPencil,
  cilPlus,
  cilTrash,
  cilUser,
  cilWarning,
  cilInfo,
} from '@coreui/icons'

import { createDancer, updateDancer, deleteDancer } from '../../../services/dancersApi'
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

const DancersSection = ({
  academyId,
  dancers,
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

  // Eliminar bailarín
  const handleDelete = async (dancerId) => {
    if (!window.confirm('¿Estás seguro de eliminar este bailarín? Se eliminará de todas las coreografías asignadas.')) {
      return
    }

    try {
      await deleteDancer(dancerId)
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al eliminar el bailarín'))
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
          <strong>Bailarines</strong>
          <CBadge color="success" className="ms-2">{dancers?.length || 0}</CBadge>
        </div>
        {!isReadOnly && (
          <CButton color="success" size="sm" onClick={handleOpenCreateModal}>
            <CIcon icon={cilPlus} className="me-1" />
            Agregar Bailarín
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {(!dancers || dancers.length === 0) ? (
          <div className="text-center py-5 text-body-secondary">
            <CIcon icon={cilUser} size="3xl" className="mb-3 opacity-50" />
            <p className="mb-0">No hay bailarines registrados</p>
            {!isReadOnly && (
              <p className="small">Haz clic en "Agregar Bailarín" para comenzar</p>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <CTable hover align="middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>CURP</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Edad</CTableHeaderCell>
                  <CTableHeaderCell>Contacto</CTableHeaderCell>
                  {!isReadOnly && (
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  )}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {dancers.map((dancer) => (
                  <CTableRow key={dancer.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{dancer.name}</div>
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
                      <div className="small">
                        {dancer.email && <div>{dancer.email}</div>}
                        {dancer.phone && <div className="text-body-secondary">{dancer.phone}</div>}
                        {!dancer.email && !dancer.phone && '—'}
                      </div>
                    </CTableDataCell>
                    {!isReadOnly && (
                      <CTableDataCell className="text-end">
                        <CButton
                          color="primary"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(dancer)}
                          title="Editar"
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dancer.id)}
                          title="Eliminar"
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
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
  onRefresh: PropTypes.func,
  isReadOnly: PropTypes.bool,
}

DancersSection.defaultProps = {
  dancers: [],
  onRefresh: () => {},
  isReadOnly: false,
}

export default DancersSection
