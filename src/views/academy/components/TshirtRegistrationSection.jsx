import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCart,
  cilCheckCircle,
  cilInfo,
  cilSave,
  cilWarning,
} from '@coreui/icons'

import {
  findOrCreateOrder,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
} from '../../../services/ordersApi'
import { listTshirtTypes, listSizeScales, listSizes } from '../../../services/catalogsApi'
import { HttpError } from '../../../services/httpClient'

// Colores para cada tipo de playera (similar al Excel)
const TSHIRT_TYPE_COLORS = {
  COMPETIDOR: { bg: '#8B6914', header: '#A67C00', text: '#fff' },
  COACH: { bg: '#7B1E7A', header: '#9B2D9B', text: '#fff' },
  ACOMPANANTE: { bg: '#2E86AB', header: '#3A9EC2', text: '#fff' },
}

// Colores para las escalas de talla
const SCALE_COLORS = {
  NINO: { bg: '#C2185B', text: '#fff' },
  JUVENIL: { bg: '#7B1FA2', text: '#fff' },
  ADULTO: { bg: '#1976D2', text: '#fff' },
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

const TshirtRegistrationSection = ({
  eventId,
  academyId,
  order: externalOrder,
  onRefresh,
  isReadOnly,
}) => {
  // Estados de catálogos
  const [tshirtTypes, setTshirtTypes] = useState([])
  const [sizeScales, setSizeScales] = useState([])
  const [sizes, setSizes] = useState([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)

  // Estado interno del order (para manejar creación y actualizaciones)
  const [internalOrder, setInternalOrder] = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(false)

  // El order efectivo es el externo o el interno
  const order = internalOrder || externalOrder

  // Estado del registro de playeras (matriz de cantidades)
  // Estructura: { [tshirtTypeId]: { [sizeId]: quantity } }
  const [quantities, setQuantities] = useState({})
  const [originalQuantities, setOriginalQuantities] = useState({})
  
  // Estados de operaciones
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [creatingOrder, setCreatingOrder] = useState(false)

  // Cargar order - usar findOrCreateOrder que sabemos que funciona
  const loadOrderData = useCallback(async () => {
    if (!eventId || !academyId) return null
    
    try {
      const response = await findOrCreateOrder({ eventId, academyId })
      // La respuesta puede ser { order, wasCreated } o el order directamente
      const orderData = response?.order || response
      return orderData
    } catch (err) {
      console.error('Error loading/creating order:', err)
      return null
    }
  }, [eventId, academyId])

  // Cargar order si no viene del padre
  useEffect(() => {
    const loadOrder = async () => {
      // Si ya tenemos order interno o externo, no cargar
      if (internalOrder || externalOrder) return
      if (!eventId || !academyId) return
      
      setLoadingOrder(true)
      try {
        const orderData = await loadOrderData()
        if (orderData?.id) {
          setInternalOrder({ ...orderData, items: orderData.items || [] })
        }
      } catch (err) {
        console.warn('Error loading order:', err)
      } finally {
        setLoadingOrder(false)
      }
    }
    loadOrder()
  }, [eventId, academyId, externalOrder, internalOrder, loadOrderData])

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingCatalogs(true)
      try {
        const [typesData, scalesData, sizesData] = await Promise.all([
          listTshirtTypes(),
          listSizeScales(),
          listSizes(),
        ])
        
        // Normalizar datos (pueden venir como array directo o con .data)
        const types = typesData?.data || typesData || []
        const scales = scalesData?.data || scalesData || []
        const allSizes = sizesData?.data || sizesData || []
        
        // Debug: ver estructura de datos
        console.log('TshirtTypes:', types)
        console.log('SizeScales:', scales)
        console.log('Sizes:', allSizes)
        
        // Normalizar campos snake_case a camelCase si es necesario
        const normalizedTypes = types.map(t => ({
          id: t.id,
          code: t.code,
          name: t.name,
        }))
        
        const normalizedScales = scales.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          audienceGroupId: s.audienceGroupId || s.audience_group_id,
        }))
        
        const normalizedSizes = allSizes.map(s => ({
          id: s.id,
          code: s.code,
          label: s.label,
          sortOrder: s.sortOrder ?? s.sort_order ?? 0,
          sizeScaleId: s.sizeScaleId || s.size_scale_id,
          ageMin: s.ageMin ?? s.age_min,
          ageMax: s.ageMax ?? s.age_max,
        }))
        
        setTshirtTypes(normalizedTypes)
        setSizeScales(normalizedScales)
        setSizes(normalizedSizes)
      } catch (err) {
        console.error('Error loading catalogs:', err)
        setError('Error al cargar los catálogos de playeras')
      } finally {
        setLoadingCatalogs(false)
      }
    }
    loadCatalogs()
  }, [])

  // Inicializar cantidades desde el order existente
  useEffect(() => {
    if (!order?.items || tshirtTypes.length === 0 || sizes.length === 0) {
      // Inicializar matriz vacía
      const emptyQuantities = {}
      tshirtTypes.forEach((type) => {
        emptyQuantities[type.id] = {}
        sizes.forEach((size) => {
          emptyQuantities[type.id][size.id] = 0
        })
      })
      setQuantities(emptyQuantities)
      setOriginalQuantities(emptyQuantities)
      return
    }

    // Mapear items existentes a la matriz
    const loadedQuantities = {}
    tshirtTypes.forEach((type) => {
      loadedQuantities[type.id] = {}
      sizes.forEach((size) => {
        // Buscar si existe un item para este tipo+talla
        const item = order.items.find(
          (i) => i.tshirtTypeId === type.id && i.sizeId === size.id
        )
        loadedQuantities[type.id][size.id] = item?.quantity || 0
      })
    })
    
    setQuantities(loadedQuantities)
    setOriginalQuantities(JSON.parse(JSON.stringify(loadedQuantities)))
  }, [order, tshirtTypes, sizes])

  // Agrupar tallas por escala
  const sizesByScale = useMemo(() => {
    const grouped = {}
    sizeScales.forEach((scale) => {
      grouped[scale.id] = sizes
        .filter((size) => size.sizeScaleId === scale.id)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    })
    return grouped
  }, [sizeScales, sizes])

  // Calcular totales
  const totals = useMemo(() => {
    const byType = {}
    const bySize = {}
    let grand = 0

    Object.entries(quantities).forEach(([typeId, sizeQtys]) => {
      byType[typeId] = 0
      Object.entries(sizeQtys).forEach(([sizeId, qty]) => {
        const numQty = parseInt(qty, 10) || 0
        byType[typeId] += numQty
        bySize[sizeId] = (bySize[sizeId] || 0) + numQty
        grand += numQty
      })
    })

    return { byType, bySize, grand }
  }, [quantities])

  // Verificar si hay cambios sin guardar
  const hasChanges = useMemo(() => {
    return JSON.stringify(quantities) !== JSON.stringify(originalQuantities)
  }, [quantities, originalQuantities])

  // Manejar cambio de cantidad
  const handleQuantityChange = useCallback((typeId, sizeId, value) => {
    const numValue = Math.max(0, parseInt(value, 10) || 0)
    setQuantities((prev) => ({
      ...prev,
      [typeId]: {
        ...prev[typeId],
        [sizeId]: numValue,
      },
    }))
    setSuccessMessage(null)
  }, [])

  // Crear pedido si no existe
  const handleCreateOrder = async () => {
    setCreatingOrder(true)
    setError(null)
    try {
      const response = await findOrCreateOrder({ eventId, academyId })
      // La respuesta puede tener { order, wasCreated } o ser el order directamente
      const createdOrder = response?.order || response
      if (createdOrder?.id) {
        // Asegurar que tiene items array
        setInternalOrder({ ...createdOrder, items: createdOrder.items || [] })
        setSuccessMessage('Registro de playeras iniciado correctamente')
      } else {
        setError('No se pudo crear el registro de playeras')
      }
      // No llamar onRefresh aquí para evitar perder el estado interno
    } catch (err) {
      setError(getErrorMessage(err, 'Error al iniciar el registro de playeras'))
    } finally {
      setCreatingOrder(false)
    }
  }

  // Guardar cambios
  const handleSave = async () => {
    if (!order?.id) {
      // Intentar cargar/crear el order si no existe
      setError('No hay un registro de playeras iniciado. Intenta recargar la página.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Obtener items actuales del pedido
      const currentItems = order.items || []

      // Debug: ver estructura de quantities
      console.log('Order ID:', order.id)
      console.log('Quantities object:', quantities)
      console.log('TshirtTypes available:', tshirtTypes)
      console.log('Sizes available:', sizes)

      // Preparar operaciones
      const operations = []

      Object.entries(quantities).forEach(([typeId, sizeQtys]) => {
        Object.entries(sizeQtys).forEach(([sizeId, newQty]) => {
          const numQty = parseInt(newQty, 10) || 0
          
          // Debug: ver qué IDs se están usando
          if (numQty > 0) {
            console.log('Processing:', { typeId, sizeId, numQty })
          }
          
          const existingItem = currentItems.find(
            (i) => i.tshirtTypeId === typeId && i.sizeId === sizeId
          )

          if (existingItem) {
            if (numQty === 0) {
              // Eliminar item
              operations.push({
                type: 'delete',
                itemId: existingItem.id,
              })
            } else if (numQty !== existingItem.quantity) {
              // Actualizar cantidad
              operations.push({
                type: 'update',
                itemId: existingItem.id,
                data: { quantity: numQty },
              })
            }
          } else if (numQty > 0) {
            // Crear nuevo item
            operations.push({
              type: 'create',
              data: {
                orderId: order.id,
                tshirtTypeId: typeId,
                sizeId: sizeId,
                quantity: numQty,
              },
            })
          }
        })
      })

      // Ejecutar operaciones secuencialmente para evitar conflictos
      for (const op of operations) {
        if (op.type === 'delete') {
          await deleteOrderItem(op.itemId)
        } else if (op.type === 'update') {
          await updateOrderItem(op.itemId, op.data)
        } else if (op.type === 'create') {
          await addOrderItem(op.data)
        }
      }

      // Recargar el order para tener los items actualizados
      const updatedOrder = await loadOrderData()
      if (updatedOrder?.id) {
        setInternalOrder({ ...updatedOrder, items: updatedOrder.items || [] })
      }

      setSuccessMessage('Registro de playeras guardado correctamente')
      setOriginalQuantities(JSON.parse(JSON.stringify(quantities)))
      onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Error al guardar el registro de playeras'))
    } finally {
      setSaving(false)
    }
  }

  // Obtener color del tipo de playera
  const getTypeColors = (typeCode) => {
    return TSHIRT_TYPE_COLORS[typeCode] || { bg: '#6c757d', header: '#868e96', text: '#fff' }
  }

  // Obtener color de la escala
  const getScaleColors = (scaleCode) => {
    return SCALE_COLORS[scaleCode] || { bg: '#6c757d', text: '#fff' }
  }

  // Renderizar celda de cantidad
  const renderQuantityCell = (typeId, sizeId, scaleCode) => {
    const value = quantities[typeId]?.[sizeId] || 0
    const scaleColors = getScaleColors(scaleCode)
    
    if (isReadOnly) {
      return (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: scaleColors.bg + '33',
            height: '40px',
            borderRadius: '4px',
          }}
        >
          <span className="fw-bold">{value}</span>
        </div>
      )
    }

    return (
      <CFormInput
        type="number"
        min="0"
        value={value}
        onChange={(e) => handleQuantityChange(typeId, sizeId, e.target.value)}
        className="text-center"
        style={{
          backgroundColor: value > 0 ? scaleColors.bg + '22' : 'transparent',
          border: `1px solid ${scaleColors.bg}66`,
        }}
      />
    )
  }

  // Loading state
  if (loadingCatalogs || loadingOrder) {
    return (
      <CCard className="mb-4">
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3 text-body-secondary">
            {loadingCatalogs ? 'Cargando catálogos de playeras...' : 'Cargando registro de playeras...'}
          </p>
        </CCardBody>
      </CCard>
    )
  }

  // No order state
  if (!order) {
    return (
      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <CIcon icon={cilCart} className="me-2" />
            <strong>Registro de Playeras</strong>
          </div>
        </CCardHeader>
        <CCardBody>
          <div className="text-center py-5">
            <CIcon icon={cilCart} size="3xl" className="mb-3 opacity-50 text-body-secondary" />
            <p className="text-body-secondary mb-3">
              No hay un registro de playeras iniciado para este evento
            </p>
            {!isReadOnly && (
              <CButton
                color="warning"
                onClick={handleCreateOrder}
                disabled={creatingOrder}
              >
                {creatingOrder && <CSpinner size="sm" className="me-2" />}
                <CIcon icon={cilCart} className="me-1" />
                Iniciar Registro de Playeras
              </CButton>
            )}
          </div>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <CIcon icon={cilCart} className="me-2" />
          <strong>Registro de Playeras</strong>
          <CBadge color="info" className="ms-2">{totals.grand} unidades</CBadge>
          {hasChanges && (
            <CBadge color="warning" className="ms-2">Sin guardar</CBadge>
          )}
        </div>
        {!isReadOnly && (
          <CButton
            color="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilSave} className="me-1" />}
            Guardar Cambios
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {/* Mensajes de error/éxito */}
        {error && (
          <CAlert color="danger" dismissible onClose={() => setError(null)}>
            <CIcon icon={cilWarning} className="me-2" />
            {error}
          </CAlert>
        )}
        {successMessage && (
          <CAlert color="success" dismissible onClose={() => setSuccessMessage(null)}>
            <CIcon icon={cilCheckCircle} className="me-2" />
            {successMessage}
          </CAlert>
        )}

        {/* Info */}
        <CAlert color="info" className="d-flex align-items-start mb-4">
          <CIcon icon={cilInfo} className="me-2 flex-shrink-0 mt-1" />
          <div>
            <strong>Instrucciones:</strong> Ingresa la cantidad de playeras que necesitas 
            para cada tipo y talla. Los cambios se guardarán al presionar el botón 
            &quot;Guardar Cambios&quot;.
          </div>
        </CAlert>

        {/* Matriz de playeras por tipo */}
        {tshirtTypes.map((type) => {
          const typeColors = getTypeColors(type.code)
          const typeTotal = totals.byType[type.id] || 0

          return (
            <div key={type.id} className="mb-4">
              {/* Header del tipo de playera */}
              <div
                className="p-3 rounded-top"
                style={{
                  backgroundColor: typeColors.header,
                  color: typeColors.text,
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 text-uppercase fw-bold">{type.name}</h5>
                  <CBadge color="light" className="text-dark fs-6">
                    Total: {typeTotal}
                  </CBadge>
                </div>
              </div>

              {/* Grid de tallas por escala */}
              <div
                className="border border-top-0 rounded-bottom p-3"
                style={{ backgroundColor: typeColors.bg + '11' }}
              >
                <CRow className="g-3">
                  {sizeScales.map((scale) => {
                    const scaleSizes = sizesByScale[scale.id] || []
                    const scaleColors = getScaleColors(scale.code)

                    if (scaleSizes.length === 0) return null

                    return (
                      <CCol key={scale.id} xs={12} lg={4}>
                        {/* Header de escala */}
                        <div
                          className="text-center py-2 rounded-top fw-bold"
                          style={{
                            backgroundColor: scaleColors.bg,
                            color: scaleColors.text,
                          }}
                        >
                          {scale.name.toUpperCase()}
                        </div>

                        {/* Tallas de esta escala */}
                        <div className="border border-top-0 rounded-bottom p-2">
                          <CRow className="g-2">
                            {scaleSizes.map((size) => (
                              <CCol key={size.id} xs={12 / Math.min(scaleSizes.length, 5)}>
                                <div className="text-center">
                                  {/* Label de talla */}
                                  <div
                                    className="small py-1 mb-1 rounded"
                                    style={{
                                      backgroundColor: scaleColors.bg + '44',
                                      color: scaleColors.bg,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {size.code}
                                    {size.ageMin && (
                                      <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                        ({size.ageMin}{size.ageMax && size.ageMax !== size.ageMin ? `-${size.ageMax}` : ''} Años)
                                      </div>
                                    )}
                                  </div>
                                  {/* Input de cantidad */}
                                  {renderQuantityCell(type.id, size.id, scale.code)}
                                </div>
                              </CCol>
                            ))}
                          </CRow>
                        </div>
                      </CCol>
                    )
                  })}
                </CRow>
              </div>
            </div>
          )
        })}

        {/* Resumen total */}
        <div className="border-top pt-4 mt-4">
          <CRow className="align-items-center">
            <CCol>
              <div className="d-flex flex-wrap gap-3">
                {tshirtTypes.map((type) => {
                  const typeColors = getTypeColors(type.code)
                  return (
                    <div key={type.id} className="d-flex align-items-center">
                      <span
                        className="rounded-circle me-2"
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: typeColors.header,
                        }}
                      />
                      <span className="text-body-secondary small">
                        {type.name}: <strong>{totals.byType[type.id] || 0}</strong>
                      </span>
                    </div>
                  )
                })}
              </div>
            </CCol>
            <CCol xs="auto">
              <div className="fs-4 fw-bold text-primary">
                Total General: {totals.grand} playeras
              </div>
            </CCol>
          </CRow>
        </div>

        {/* Nota informativa */}
        <div
          className="mt-4 p-3 text-center rounded"
          style={{ backgroundColor: '#fff3cd', color: '#856404' }}
        >
          <strong>* LAS PLAYERAS SERÁN PERSONALIZADAS</strong>
        </div>
      </CCardBody>
    </CCard>
  )
}

TshirtRegistrationSection.propTypes = {
  eventId: PropTypes.string.isRequired,
  academyId: PropTypes.string.isRequired,
  order: PropTypes.shape({
    id: PropTypes.string,
    items: PropTypes.array,
  }),
  onRefresh: PropTypes.func,
  isReadOnly: PropTypes.bool,
}

TshirtRegistrationSection.defaultProps = {
  order: null,
  onRefresh: () => {},
  isReadOnly: false,
}

export default TshirtRegistrationSection
