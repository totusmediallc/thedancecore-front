import React, { useCallback, useEffect, useState } from 'react'
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
  CFormSelect,
  CFormTextarea,
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
  cilCart,
  cilPencil,
  cilPlus,
  cilTrash,
  cilWarning,
} from '@coreui/icons'

import {
  findOrCreateOrder,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
} from '../../../services/ordersApi'
import { listTshirtTypes, listSizes } from '../../../services/catalogsApi'
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

const TshirtOrderSection = ({
  eventId,
  academyId,
  order,
  onRefresh,
  isReadOnly,
}) => {
  // Estados de catálogos
  const [tshirtTypes, setTshirtTypes] = useState([])
  const [sizes, setSizes] = useState([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)

  // Estados de operaciones
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedItem, setSelectedItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Estados de formulario
  const [formData, setFormData] = useState({
    tshirtTypeId: '',
    sizeId: '',
    quantity: 1,
    notes: '',
  })

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingCatalogs(true)
      try {
        const [typesData, sizesData] = await Promise.all([
          listTshirtTypes(),
          listSizes(),
        ])
        setTshirtTypes(typesData || [])
        setSizes(sizesData || [])
      } catch (err) {
        console.error('Error loading catalogs:', err)
      } finally {
        setLoadingCatalogs(false)
      }
    }
    loadCatalogs()
  }, [])

  // Crear pedido si no existe
  const handleCreateOrder = async () => {
    setCreatingOrder(true)
    try {
      await findOrCreateOrder({ eventId, academyId })
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al crear el pedido'))
    } finally {
      setCreatingOrder(false)
    }
  }

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({
      tshirtTypeId: '',
      sizeId: '',
      quantity: 1,
      notes: '',
    })
    setSelectedItem(null)
    setError(null)
  }, [])

  // Abrir modal para crear
  const handleOpenCreateModal = useCallback(() => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }, [resetForm])

  // Abrir modal para editar
  const handleOpenEditModal = useCallback((item) => {
    setSelectedItem(item)
    setFormData({
      tshirtTypeId: item.tshirtTypeId || item.tshirtType?.id || '',
      sizeId: item.sizeId || item.size?.id || '',
      quantity: item.quantity || 1,
      notes: item.notes || '',
    })
    setModalMode('edit')
    setShowModal(true)
  }, [])

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    resetForm()
  }, [resetForm])

  // Manejar cambios en formulario
  const handleInputChange = useCallback((e) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 1 : value,
    }))
  }, [])

  // Guardar ítem
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        tshirtTypeId: formData.tshirtTypeId,
        sizeId: formData.sizeId,
        quantity: formData.quantity,
        ...(formData.notes && { notes: formData.notes }),
      }

      if (modalMode === 'create') {
        await addOrderItem({
          ...payload,
          orderId: order.id,
        })
      } else {
        await updateOrderItem(selectedItem.id, payload)
      }

      handleCloseModal()
      onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar ítem
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('¿Estás seguro de eliminar este ítem del pedido?')) {
      return
    }

    try {
      await deleteOrderItem(itemId)
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al eliminar el ítem'))
    }
  }

  // Obtener nombre del tipo de playera
  const getTshirtTypeName = (item) => {
    return item.tshirtType?.name ||
           tshirtTypes.find((t) => t.id === item.tshirtTypeId)?.name ||
           '—'
  }

  // Obtener nombre de la talla
  const getSizeName = (item) => {
    return item.size?.name ||
           sizes.find((s) => s.id === item.sizeId)?.name ||
           '—'
  }

  // Calcular total de playeras
  const totalItems = (order?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <CIcon icon={cilCart} className="me-2" />
          <strong>Pedido de Playeras</strong>
          <CBadge color="warning" className="ms-2">{totalItems} unidades</CBadge>
        </div>
        {!isReadOnly && order && (
          <CButton
            color="warning"
            size="sm"
            onClick={handleOpenCreateModal}
            disabled={loadingCatalogs}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Agregar Playera
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {loadingCatalogs ? (
          <div className="text-center py-4">
            <CSpinner color="primary" />
          </div>
        ) : !order ? (
          <div className="text-center py-5">
            <CIcon icon={cilCart} size="3xl" className="mb-3 opacity-50 text-body-secondary" />
            <p className="text-body-secondary mb-3">No hay un pedido de playeras iniciado</p>
            {!isReadOnly && (
              <CButton
                color="warning"
                onClick={handleCreateOrder}
                disabled={creatingOrder}
              >
                {creatingOrder && <CSpinner size="sm" className="me-2" />}
                <CIcon icon={cilPlus} className="me-1" />
                Iniciar Pedido de Playeras
              </CButton>
            )}
          </div>
        ) : (!order.items || order.items.length === 0) ? (
          <div className="text-center py-5 text-body-secondary">
            <CIcon icon={cilCart} size="3xl" className="mb-3 opacity-50" />
            <p className="mb-0">No hay playeras en el pedido</p>
            {!isReadOnly && (
              <p className="small">Haz clic en "Agregar Playera" para añadir ítems</p>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <CTable hover align="middle">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Tipo de Playera</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Talla</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Cantidad</CTableHeaderCell>
                    <CTableHeaderCell>Notas</CTableHeaderCell>
                    {!isReadOnly && (
                      <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                    )}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {order.items.map((item) => (
                    <CTableRow key={item.id}>
                      <CTableDataCell>
                        <strong>{getTshirtTypeName(item)}</strong>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge color="secondary">{getSizeName(item)}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CBadge color="primary">{item.quantity}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <span className="small text-body-secondary">
                          {item.notes || '—'}
                        </span>
                      </CTableDataCell>
                      {!isReadOnly && (
                        <CTableDataCell className="text-end">
                          <CButton
                            color="primary"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(item)}
                            title="Editar"
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
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

            {/* Resumen */}
            <div className="border-top pt-3 mt-3">
              <CRow>
                <CCol>
                  <div className="text-body-secondary">
                    <strong>Total de ítems:</strong> {order.items.length} líneas
                  </div>
                </CCol>
                <CCol className="text-end">
                  <div className="fs-5 fw-bold">
                    Total: {totalItems} playeras
                  </div>
                </CCol>
              </CRow>
            </div>
          </>
        )}
      </CCardBody>

      {/* Modal de crear/editar ítem */}
      <CModal visible={showModal} onClose={handleCloseModal}>
        <CModalHeader>
          <CModalTitle>
            {modalMode === 'create' ? 'Agregar Playera' : 'Editar Playera'}
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

            <CRow className="g-3">
              <CCol md={12}>
                <CFormLabel htmlFor="tshirtTypeId">Tipo de Playera *</CFormLabel>
                <CFormSelect
                  id="tshirtTypeId"
                  name="tshirtTypeId"
                  value={formData.tshirtTypeId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {tshirtTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="sizeId">Talla *</CFormLabel>
                <CFormSelect
                  id="sizeId"
                  name="sizeId"
                  value={formData.sizeId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar talla</option>
                  {sizes.map((size) => (
                    <option key={size.id} value={size.id}>{size.name}</option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="quantity">Cantidad *</CFormLabel>
                <CFormInput
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </CCol>

              <CCol md={12}>
                <CFormLabel htmlFor="notes">Notas</CFormLabel>
                <CFormTextarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Notas adicionales (opcional)"
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={handleCloseModal}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              {modalMode === 'create' ? 'Agregar' : 'Guardar Cambios'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CCard>
  )
}

TshirtOrderSection.propTypes = {
  eventId: PropTypes.string.isRequired,
  academyId: PropTypes.string.isRequired,
  order: PropTypes.shape({
    id: PropTypes.string,
    items: PropTypes.array,
  }),
  onRefresh: PropTypes.func,
  isReadOnly: PropTypes.bool,
}

TshirtOrderSection.defaultProps = {
  order: null,
  onRefresh: () => {},
  isReadOnly: false,
}

export default TshirtOrderSection
