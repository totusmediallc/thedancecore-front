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
  CCollapse,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CListGroup,
  CListGroupItem,
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
  cilCheckCircle,
  cilMinus,
  cilMusicNote,
  cilPencil,
  cilPlus,
  cilTrash,
  cilUser,
  cilUserFollow,
  cilWarning,
} from '@coreui/icons'

import { listCategories } from '../../../services/categoriesApi'
import { listSubcategories } from '../../../services/subcategoriesApi'
import { listMusicGenres } from '../../../services/musicGenresApi'
import {
  createChoreography,
  deleteChoreography,
  updateChoreography,
} from '../../../services/choreographiesApi'
import {
  bulkAssignDancersToChoreography,
  removeDancerFromChoreography,
} from '../../../services/choreographyDancersApi'
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

const ChoreographiesSection = ({
  eventId,
  academyId,
  choreographies,
  dancers,
  onRefresh,
  isReadOnly,
}) => {
  // Estados de catálogos
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [musicGenres, setMusicGenres] = useState([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(true)

  // Estados de modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [selectedChoreography, setSelectedChoreography] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Estados de formulario
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    musicGenreId: '',
  })

  // Estado para asignación de bailarines
  const [showDancersModal, setShowDancersModal] = useState(false)
  const [dancersChoreography, setDancersChoreography] = useState(null)
  const [selectedDancers, setSelectedDancers] = useState([])
  const [assigningDancers, setAssigningDancers] = useState(false)

  // Estado para expandir/colapsar detalles
  const [expandedIds, setExpandedIds] = useState({})

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      setLoadingCatalogs(true)
      try {
        const [categoriesData, subcategoriesData, genresData] = await Promise.all([
          listCategories(),
          listSubcategories(),
          listMusicGenres(),
        ])
        setCategories(categoriesData || [])
        setSubcategories(subcategoriesData || [])
        setMusicGenres(genresData || [])
      } catch (err) {
        console.error('Error loading catalogs:', err)
      } finally {
        setLoadingCatalogs(false)
      }
    }
    loadCatalogs()
  }, [])

  // Filtrar subcategorías por categoría seleccionada
  const filteredSubcategories = useMemo(() => {
    if (!formData.categoryId) return []
    return subcategories.filter(
      (sub) => sub.categoryId === formData.categoryId || sub.category?.id === formData.categoryId
    )
  }, [subcategories, formData.categoryId])

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      categoryId: '',
      subcategoryId: '',
      musicGenreId: '',
    })
    setSelectedChoreography(null)
    setError(null)
  }, [])

  // Abrir modal para crear
  const handleOpenCreateModal = useCallback(() => {
    resetForm()
    setModalMode('create')
    setShowModal(true)
  }, [resetForm])

  // Abrir modal para editar
  const handleOpenEditModal = useCallback((choreography) => {
    setSelectedChoreography(choreography)
    setFormData({
      name: choreography.name || '',
      categoryId: choreography.categoryId || choreography.category?.id || '',
      subcategoryId: choreography.subcategoryId || choreography.subcategory?.id || '',
      musicGenreId: choreography.musicGenreId || choreography.musicGenre?.id || '',
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
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      // Resetear subcategoría si cambia categoría
      if (name === 'categoryId') {
        updated.subcategoryId = ''
      }
      return updated
    })
  }, [])

  // Guardar coreografía
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: formData.name,
        academyId,
        eventId,
        categoryId: formData.categoryId,
        musicGenreId: formData.musicGenreId,
        ...(formData.subcategoryId && { subcategoryId: formData.subcategoryId }),
      }

      if (modalMode === 'create') {
        await createChoreography(payload)
      } else {
        await updateChoreography(selectedChoreography.id, payload)
      }

      handleCloseModal()
      onRefresh?.()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar coreografía
  const handleDelete = async (choreographyId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta coreografía? Se eliminarán también las asignaciones de bailarines.')) {
      return
    }

    try {
      await deleteChoreography(choreographyId)
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al eliminar la coreografía'))
    }
  }

  // Toggle expandir/colapsar
  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Abrir modal de asignación de bailarines
  const handleOpenDancersModal = useCallback((choreography) => {
    setDancersChoreography(choreography)
    // Preseleccionar bailarines ya asignados
    const assignedIds = (choreography.dancers || []).map(
      (d) => d.dancerId || d.dancer?.id || d.id
    )
    setSelectedDancers(assignedIds)
    setShowDancersModal(true)
  }, [])

  // Cerrar modal de bailarines
  const handleCloseDancersModal = useCallback(() => {
    setShowDancersModal(false)
    setDancersChoreography(null)
    setSelectedDancers([])
  }, [])

  // Toggle selección de bailarín
  const toggleDancerSelection = useCallback((dancerId) => {
    setSelectedDancers((prev) => {
      if (prev.includes(dancerId)) {
        return prev.filter((id) => id !== dancerId)
      }
      return [...prev, dancerId]
    })
  }, [])

  // Guardar asignación de bailarines
  const handleSaveDancers = async () => {
    if (!dancersChoreography) return
    setAssigningDancers(true)

    try {
      const currentDancerIds = (dancersChoreography.dancers || []).map(
        (d) => d.dancerId || d.dancer?.id || d.id
      )

      // Bailarines a eliminar
      const toRemove = currentDancerIds.filter((id) => !selectedDancers.includes(id))
      // Bailarines a agregar
      const toAdd = selectedDancers.filter((id) => !currentDancerIds.includes(id))

      // Eliminar bailarines
      for (const dancerId of toRemove) {
        await removeDancerFromChoreography(dancerId, dancersChoreography.id)
      }

      // Agregar bailarines en bulk
      if (toAdd.length > 0) {
        await bulkAssignDancersToChoreography({
          choreographyId: dancersChoreography.id,
          dancerIds: toAdd,
        })
      }

      handleCloseDancersModal()
      onRefresh?.()
    } catch (err) {
      alert(getErrorMessage(err, 'Error al asignar bailarines'))
    } finally {
      setAssigningDancers(false)
    }
  }

  // Obtener nombre de categoría
  const getCategoryName = (choreography) => {
    return choreography.category?.name || 
           categories.find((c) => c.id === choreography.categoryId)?.name || 
           '—'
  }

  // Obtener nombre de subcategoría
  const getSubcategoryName = (choreography) => {
    if (!choreography.subcategoryId && !choreography.subcategory) return null
    return choreography.subcategory?.name ||
           subcategories.find((s) => s.id === choreography.subcategoryId)?.name ||
           '—'
  }

  // Obtener nombre de género musical
  const getGenreName = (choreography) => {
    return choreography.musicGenre?.name ||
           musicGenres.find((g) => g.id === choreography.musicGenreId)?.name ||
           '—'
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <CIcon icon={cilMusicNote} className="me-2" />
          <strong>Coreografías</strong>
          <CBadge color="primary" className="ms-2">{choreographies?.length || 0}</CBadge>
        </div>
        {!isReadOnly && (
          <CButton 
            color="primary" 
            size="sm" 
            onClick={handleOpenCreateModal}
            disabled={loadingCatalogs}
          >
            <CIcon icon={cilPlus} className="me-1" />
            Agregar Coreografía
          </CButton>
        )}
      </CCardHeader>
      <CCardBody>
        {(!choreographies || choreographies.length === 0) ? (
          <div className="text-center py-5 text-body-secondary">
            <CIcon icon={cilMusicNote} size="3xl" className="mb-3 opacity-50" />
            <p className="mb-0">No hay coreografías registradas</p>
            {!isReadOnly && (
              <p className="small">Haz clic en "Agregar Coreografía" para comenzar</p>
            )}
          </div>
        ) : (
          <div className="choreographies-list">
            {choreographies.map((choreo) => (
              <CCard key={choreo.id} className="mb-3 border">
                <CCardBody className="p-3">
                  <CRow className="align-items-center">
                    <CCol xs={12} md={6}>
                      <h6 className="mb-1">{choreo.name}</h6>
                      <div className="small text-body-secondary">
                        <CBadge color="secondary" className="me-1">{getCategoryName(choreo)}</CBadge>
                        {getSubcategoryName(choreo) && (
                          <CBadge color="light" textColor="dark" className="me-1">
                            {getSubcategoryName(choreo)}
                          </CBadge>
                        )}
                        <CBadge color="info">{getGenreName(choreo)}</CBadge>
                      </div>
                    </CCol>
                    <CCol xs={12} md={3} className="mt-2 mt-md-0">
                      <div 
                        className="d-flex align-items-center text-body-secondary cursor-pointer"
                        onClick={() => toggleExpand(choreo.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CIcon icon={cilUser} className="me-1" />
                        <span>{choreo.dancers?.length || 0} bailarines</span>
                        <CIcon 
                          icon={expandedIds[choreo.id] ? cilMinus : cilPlus} 
                          className="ms-auto" 
                          size="sm"
                        />
                      </div>
                    </CCol>
                    <CCol xs={12} md={3} className="mt-2 mt-md-0">
                      <div className="d-flex gap-1 justify-content-md-end">
                        {!isReadOnly && (
                          <>
                            <CButton 
                              color="info" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenDancersModal(choreo)}
                              title="Asignar bailarines"
                            >
                              <CIcon icon={cilUserFollow} />
                            </CButton>
                            <CButton 
                              color="primary" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenEditModal(choreo)}
                              title="Editar"
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton 
                              color="danger" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(choreo.id)}
                              title="Eliminar"
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </>
                        )}
                      </div>
                    </CCol>
                  </CRow>

                  {/* Lista de bailarines expandible */}
                  <CCollapse visible={expandedIds[choreo.id]}>
                    <div className="mt-3 pt-3 border-top">
                      {(!choreo.dancers || choreo.dancers.length === 0) ? (
                        <p className="text-body-secondary small mb-0">
                          No hay bailarines asignados
                        </p>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {choreo.dancers.map((d) => {
                            const dancer = d.dancer || d
                            return (
                              <CBadge 
                                key={dancer.id} 
                                color="light" 
                                textColor="dark"
                                className="py-2 px-3"
                              >
                                <CIcon icon={cilUser} className="me-1" size="sm" />
                                {dancer.name}
                              </CBadge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CCollapse>
                </CCardBody>
              </CCard>
            ))}
          </div>
        )}
      </CCardBody>

      {/* Modal de crear/editar coreografía */}
      <CModal visible={showModal} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            {modalMode === 'create' ? 'Nueva Coreografía' : 'Editar Coreografía'}
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
                <CFormLabel htmlFor="name">Nombre de la coreografía *</CFormLabel>
                <CFormInput
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ej: Ritmo Latino"
                  required
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="categoryId">Categoría *</CFormLabel>
                <CFormSelect
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="subcategoryId">Subcategoría</CFormLabel>
                <CFormSelect
                  id="subcategoryId"
                  name="subcategoryId"
                  value={formData.subcategoryId}
                  onChange={handleInputChange}
                  disabled={!formData.categoryId || filteredSubcategories.length === 0}
                >
                  <option value="">Sin subcategoría</option>
                  {filteredSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={12}>
                <CFormLabel htmlFor="musicGenreId">Género Musical *</CFormLabel>
                <CFormSelect
                  id="musicGenreId"
                  name="musicGenreId"
                  value={formData.musicGenreId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar género</option>
                  {musicGenres.map((genre) => (
                    <option key={genre.id} value={genre.id}>{genre.name}</option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="ghost" onClick={handleCloseModal}>
              Cancelar
            </CButton>
            <CButton type="submit" color="primary" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              {modalMode === 'create' ? 'Crear Coreografía' : 'Guardar Cambios'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal de asignación de bailarines */}
      <CModal visible={showDancersModal} onClose={handleCloseDancersModal} size="lg">
        <CModalHeader>
          <CModalTitle>
            Asignar Bailarines - {dancersChoreography?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {(!dancers || dancers.length === 0) ? (
            <CAlert color="warning">
              <CIcon icon={cilWarning} className="me-2" />
              No hay bailarines registrados en la academia. 
              Primero debes agregar bailarines en la pestaña correspondiente.
            </CAlert>
          ) : (
            <>
              <p className="text-body-secondary mb-3">
                Selecciona los bailarines que participarán en esta coreografía:
              </p>
              <CListGroup>
                {dancers.map((dancer) => (
                  <CListGroupItem
                    key={dancer.id}
                    className="d-flex justify-content-between align-items-center cursor-pointer"
                    onClick={() => toggleDancerSelection(dancer.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <CIcon icon={cilUser} className="me-2" />
                      {dancer.name}
                      {dancer.curp && (
                        <small className="text-body-secondary ms-2">({dancer.curp})</small>
                      )}
                    </div>
                    <CIcon 
                      icon={cilCheckCircle} 
                      className={selectedDancers.includes(dancer.id) ? 'text-success' : 'text-body-secondary opacity-25'}
                    />
                  </CListGroupItem>
                ))}
              </CListGroup>
              <div className="mt-3 text-body-secondary">
                <strong>{selectedDancers.length}</strong> bailarines seleccionados
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={handleCloseDancersModal}>
            Cancelar
          </CButton>
          <CButton 
            color="primary" 
            onClick={handleSaveDancers}
            disabled={assigningDancers || !dancers || dancers.length === 0}
          >
            {assigningDancers && <CSpinner size="sm" className="me-2" />}
            Guardar Asignación
          </CButton>
        </CModalFooter>
      </CModal>
    </CCard>
  )
}

ChoreographiesSection.propTypes = {
  eventId: PropTypes.string.isRequired,
  academyId: PropTypes.string.isRequired,
  choreographies: PropTypes.array,
  dancers: PropTypes.array,
  onRefresh: PropTypes.func,
  isReadOnly: PropTypes.bool,
}

ChoreographiesSection.defaultProps = {
  choreographies: [],
  dancers: [],
  onRefresh: () => {},
  isReadOnly: false,
}

export default ChoreographiesSection
