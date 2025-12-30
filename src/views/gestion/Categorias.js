import React, { useCallback, useEffect, useMemo, useState } from 'react'

import CIcon from '@coreui/icons-react'
import { cilList, cilPencil, cilPlus, cilReload, cilTrash, cilWarning } from '@coreui/icons'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useAuth } from '../../hooks/useAuth'
import { HttpError } from '../../services/httpClient'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../services/categoriesApi'
import {
  createSubcategory,
  deleteSubcategory,
  listSubcategories,
  updateSubcategory,
} from '../../services/subcategoriesApi'

const LIMIT_OPTIONS = [5, 10, 20]

const DEFAULT_TABLE_FILTERS = {
  search: '',
  page: 1,
  limit: 10,
}

const getErrorMessage = (error, fallback = 'Ocurrió un error inesperado') => {
  if (!error) {
    return fallback
  }

  if (error instanceof HttpError) {
    const { data, message } = error
    if (Array.isArray(data?.message)) {
      return data.message.join('. ')
    }
    return data?.message ?? message ?? fallback
  }

  if (typeof error === 'string') {
    return error
  }

  return error.message ?? fallback
}

const toNumberOrNull = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

const formatAgeRange = (data) => {
  if (!data) {
    return 'Sin datos'
  }

  const ageMin = toNumberOrNull(data.age_min)
  const ageMax = toNumberOrNull(data.age_max)
  const openEnded = Boolean(data.open_ended)

  if (ageMin !== null && ageMax !== null && !openEnded) {
    return `${ageMin} - ${ageMax} años`
  }

  if (ageMin !== null && openEnded) {
    return `${ageMin}+ años`
  }

  if (ageMin !== null && ageMax === null) {
    return `Desde ${ageMin} años`
  }

  if (ageMin === null && ageMax !== null) {
    return `Hasta ${ageMax} años`
  }

  return 'Sin datos'
}

const formatTeamSizeRange = (data) => {
  if (!data) {
    return 'Sin datos'
  }

  const min = toNumberOrNull(data.team_min)
  const max = toNumberOrNull(data.team_max)
  const openEnded = Boolean(data.open_ended)

  if (min !== null && max !== null && !openEnded) {
    if (min === max) {
      return `${min} integrante${min === 1 ? '' : 's'}`
    }
    return `${min} - ${max} integrantes`
  }

  if (min !== null && openEnded) {
    return `${min}+ integrantes`
  }

  if (min !== null && max === null) {
    return `Desde ${min} integrantes`
  }

  if (min === null && max !== null) {
    return `Hasta ${max} integrantes`
  }

  return 'Sin límite definido'
}

const CategoryFormModal = ({ mode, visible, submitting, onClose, onSubmit, category }) => {
  const isEditMode = mode === 'edit'

  const baseState = useMemo(
    () =>
      isEditMode && category
        ? {
            name: category.name ?? '',
            ageMin: category.data?.age_min ?? category.data?.ageMin ?? '',
            ageMax: category.data?.age_max ?? category.data?.ageMax ?? '',
            openEnded: Boolean(category.data?.open_ended ?? category.data?.openEnded),
          }
        : {
            name: '',
            ageMin: '',
            ageMax: '',
            openEnded: false,
          },
    [category, isEditMode],
  )

  const [formState, setFormState] = useState(baseState)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
    }
  }, [baseState, visible])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenEndedChange = (event) => {
    const checked = event.target.checked
    setFormState((prev) => ({ ...prev, openEnded: checked, ageMax: checked ? '' : prev.ageMax }))
  }

  const validate = useCallback(() => {
    const nextErrors = {}
    const trimmedName = formState.name.trim()

    if (!trimmedName) {
      nextErrors.name = 'Ingresa un nombre'
    }

    const ageMinValue = toNumberOrNull(formState.ageMin)
    if (ageMinValue === null) {
      nextErrors.ageMin = 'Ingresa la edad mínima'
    } else if (ageMinValue < 0) {
      nextErrors.ageMin = 'La edad mínima no puede ser negativa'
    }

    let ageMaxValue = null
    if (formState.openEnded) {
      ageMaxValue = null
    } else {
      ageMaxValue = toNumberOrNull(formState.ageMax)
      if (ageMaxValue === null) {
        nextErrors.ageMax = 'Ingresa la edad máxima'
      } else if (ageMinValue !== null && ageMaxValue < ageMinValue) {
        nextErrors.ageMax = 'La edad máxima debe ser mayor o igual a la mínima'
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      return { isValid: false, errors: nextErrors, payload: null }
    }

    return {
      isValid: true,
      errors: {},
      payload: {
        name: trimmedName,
        data: {
          age_min: ageMinValue,
          age_max: formState.openEnded ? null : ageMaxValue,
          open_ended: formState.openEnded,
        },
      },
    }
  }, [formState])

  const handleSubmit = (event) => {
    event.preventDefault()
    const result = validate()
    setErrors(result.errors)
    if (!result.isValid || !result.payload) {
      return
    }
    onSubmit(result.payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>{isEditMode ? 'Editar categoría' : 'Nueva categoría'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel htmlFor="category-name">Nombre</CFormLabel>
              <CFormInput
                id="category-name"
                value={formState.name}
                onChange={handleChange('name')}
                disabled={submitting}
                placeholder="Ej. Teens"
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="category-age-min">Edad mínima</CFormLabel>
              <CFormInput
                id="category-age-min"
                type="number"
                min={0}
                value={formState.ageMin}
                onChange={handleChange('ageMin')}
                disabled={submitting}
                placeholder="Ej. 4"
              />
              {errors.ageMin && <div className="invalid-feedback d-block">{errors.ageMin}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="category-age-max">Edad máxima</CFormLabel>
              <CFormInput
                id="category-age-max"
                type="number"
                min={0}
                value={formState.ageMax}
                onChange={handleChange('ageMax')}
                disabled={submitting || formState.openEnded}
                placeholder="Ej. 7"
              />
              {errors.ageMax && <div className="invalid-feedback d-block">{errors.ageMax}</div>}
            </CCol>
            <CCol xs={12}>
              <CFormSwitch
                id="category-open-ended"
                label="Sin límite superior (abre la categoría)"
                checked={formState.openEnded}
                onChange={handleOpenEndedChange}
                disabled={submitting}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting && <CSpinner size="sm" className="me-2" />} Guardar cambios
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const SubcategoryFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  subcategory,
}) => {
  const isEditMode = mode === 'edit'

  const baseState = useMemo(
    () =>
      isEditMode && subcategory
        ? {
            name: subcategory.name ?? '',
            teamMin: subcategory.data?.team_min ?? subcategory.data?.teamMin ?? '',
            teamMax: subcategory.data?.team_max ?? subcategory.data?.teamMax ?? '',
            openEnded: Boolean(subcategory.data?.open_ended ?? subcategory.data?.openEnded),
          }
        : {
            name: '',
            teamMin: '',
            teamMax: '',
            openEnded: false,
          },
    [isEditMode, subcategory],
  )

  const [formState, setFormState] = useState(baseState)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
    }
  }, [baseState, visible])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenEndedChange = (event) => {
    const checked = event.target.checked
    setFormState((prev) => ({ ...prev, openEnded: checked, teamMax: checked ? '' : prev.teamMax }))
  }

  const validate = useCallback(() => {
    const nextErrors = {}
    const trimmedName = formState.name.trim()

    if (!trimmedName) {
      nextErrors.name = 'Ingresa un nombre'
    }

    const teamMinValue = toNumberOrNull(formState.teamMin)
    if (formState.teamMin !== '' && teamMinValue === null) {
      nextErrors.teamMin = 'Ingresa un número válido'
    } else if (teamMinValue !== null && teamMinValue < 0) {
      nextErrors.teamMin = 'El mínimo no puede ser negativo'
    }

    let teamMaxValue = null
    if (formState.openEnded) {
      teamMaxValue = null
    } else {
      teamMaxValue = toNumberOrNull(formState.teamMax)
      if (formState.teamMax !== '' && teamMaxValue === null) {
        nextErrors.teamMax = 'Ingresa un número válido'
      } else if (teamMaxValue !== null && teamMaxValue < 0) {
        nextErrors.teamMax = 'El máximo no puede ser negativo'
      }
    }

    if (
      teamMinValue !== null &&
      teamMaxValue !== null &&
      teamMaxValue < teamMinValue
    ) {
      nextErrors.teamMax = 'El máximo debe ser mayor o igual al mínimo'
    }

    if (Object.keys(nextErrors).length > 0) {
      return { isValid: false, errors: nextErrors, payload: null }
    }

    return {
      isValid: true,
      errors: {},
      payload: {
        name: trimmedName,
        data: {
          team_min: teamMinValue,
          team_max: formState.openEnded ? null : teamMaxValue,
          open_ended: formState.openEnded,
        },
      },
    }
  }, [formState])

  const handleSubmit = (event) => {
    event.preventDefault()
    const result = validate()
    setErrors(result.errors)
    if (!result.isValid || !result.payload) {
      return
    }
    onSubmit(result.payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>{isEditMode ? 'Editar subcategoría' : 'Nueva subcategoría'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel htmlFor="subcategory-name">Nombre</CFormLabel>
              <CFormInput
                id="subcategory-name"
                value={formState.name}
                onChange={handleChange('name')}
                disabled={submitting}
                placeholder="Ej. Small Team"
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="subcategory-team-min">Integrantes mínimos</CFormLabel>
              <CFormInput
                id="subcategory-team-min"
                type="number"
                min={0}
                value={formState.teamMin}
                onChange={handleChange('teamMin')}
                disabled={submitting}
                placeholder="Ej. 4"
              />
              {errors.teamMin && <div className="invalid-feedback d-block">{errors.teamMin}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="subcategory-team-max">Integrantes máximos</CFormLabel>
              <CFormInput
                id="subcategory-team-max"
                type="number"
                min={0}
                value={formState.teamMax}
                onChange={handleChange('teamMax')}
                disabled={submitting || formState.openEnded}
                placeholder="Ej. 9"
              />
              {errors.teamMax && <div className="invalid-feedback d-block">{errors.teamMax}</div>}
            </CCol>
            <CCol xs={12}>
              <CFormSwitch
                id="subcategory-open-ended"
                label="Sin límite superior de integrantes"
                checked={formState.openEnded}
                onChange={handleOpenEndedChange}
                disabled={submitting}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting && <CSpinner size="sm" className="me-2" />} Guardar cambios
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const CategoryDeleteModal = ({ visible, category, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar categoría</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar la categoría <strong>{category?.name}</strong>. Esta acción es permanente.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" /> Verifica que ninguna coreografía dependa de esta categoría antes de continuar.
      </CAlert>
    </CModalBody>
    <CModalFooter className="bg-body-tertiary justify-content-between">
      <CButton color="secondary" variant="ghost" onClick={onClose} disabled={deleting}>
        Cancelar
      </CButton>
      <CButton color="danger" onClick={onConfirm} disabled={deleting}>
        {deleting && <CSpinner size="sm" className="me-2" />} Eliminar definitivamente
      </CButton>
    </CModalFooter>
  </CModal>
)

const SubcategoryDeleteModal = ({ visible, subcategory, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar subcategoría</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar la subcategoría <strong>{subcategory?.name}</strong>. Esta acción es permanente.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" /> Asegúrate de actualizar las coreografías relacionadas.
      </CAlert>
    </CModalBody>
    <CModalFooter className="bg-body-tertiary justify-content-between">
      <CButton color="secondary" variant="ghost" onClick={onClose} disabled={deleting}>
        Cancelar
      </CButton>
      <CButton color="danger" onClick={onConfirm} disabled={deleting}>
        {deleting && <CSpinner size="sm" className="me-2" />} Eliminar definitivamente
      </CButton>
    </CModalFooter>
  </CModal>
)

const CategoriesPanel = ({ isAdmin }) => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_TABLE_FILTERS }))
  const [feedback, setFeedback] = useState(null)
  const [formModalState, setFormModalState] = useState({ visible: false, mode: 'create', category: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteModalState, setDeleteModalState] = useState({ visible: false, category: null })
  const [deleting, setDeleting] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listCategories()
      setCategories(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load categories', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron obtener las categorías'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
  }, [categories])

  const filteredCategories = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    if (!normalizedSearch) {
      return sortedCategories
    }
    return sortedCategories.filter((category) => {
      const data = category.data ?? {}
      const haystack = [
        category.name,
        data.age_min,
        data.age_max,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => value.toString().toLowerCase())

      return haystack.some((value) => value.includes(normalizedSearch))
    })
  }, [filters.search, sortedCategories])

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / filters.limit || 1))
  const currentPage = Math.min(filters.page, totalPages)

  useEffect(() => {
    setFilters((prev) => {
      const safePage = Math.min(prev.page, totalPages)
      if (safePage === prev.page) {
        return prev
      }
      return { ...prev, page: safePage }
    })
  }, [totalPages])

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredCategories.slice(start, end)
  }, [currentPage, filteredCategories, filters.limit])

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }

  const handleLimitChange = (event) => {
    const value = Number(event.target.value)
    setFilters((prev) => ({ ...prev, limit: value, page: 1 }))
  }

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const openCreateModal = () => {
    setFormModalState({ visible: true, mode: 'create', category: null })
  }

  const openEditModal = (category) => {
    setFormModalState({ visible: true, mode: 'edit', category })
  }

  const closeFormModal = () => {
    if (formSubmitting) {
      return
    }
    setFormModalState({ visible: false, mode: 'create', category: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      if (formModalState.mode === 'edit' && formModalState.category) {
        await updateCategory(formModalState.category.id, payload)
        setFeedback({ type: 'success', message: 'Categoría actualizada correctamente' })
      } else {
        await createCategory(payload)
        setFeedback({ type: 'success', message: 'Categoría creada correctamente' })
      }
      setFormModalState({ visible: false, mode: 'create', category: null })
      await loadCategories()
    } catch (requestError) {
      console.error('Category submit failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar la categoría') })
    } finally {
      setFormSubmitting(false)
    }
  }

  const openDeleteModal = (category) => {
    setDeleteModalState({ visible: true, category })
  }

  const closeDeleteModal = () => {
    if (deleting) {
      return
    }
    setDeleteModalState({ visible: false, category: null })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.category) {
      return
    }
    setDeleting(true)
    setFeedback(null)
    try {
      await deleteCategory(deleteModalState.category.id)
      setFeedback({ type: 'success', message: 'Categoría eliminada correctamente' })
      setDeleteModalState({ visible: false, category: null })
      await loadCategories()
    } catch (requestError) {
      console.error('Category delete failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar la categoría') })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-md-row align-items-md-center gap-2 justify-content-between">
        <div>
          <h5 className="mb-0">Categorías</h5>
          <small className="text-body-secondary">Rangos de edad para clasificar coreografías</small>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="ghost" onClick={loadCategories} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
          </CButton>
          {isAdmin && (
            <CButton color="primary" onClick={openCreateModal}>
              <CIcon icon={cilPlus} className="me-2" /> Nueva categoría
            </CButton>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {feedback && (
          <CAlert color={feedback.type} className="mb-4" dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}

        <CForm className="mb-4">
          <CRow className="g-3">
            <CCol xs={12} md={8}>
              <CFormLabel htmlFor="category-search">Buscar</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilList} />
                </CInputGroupText>
                <CFormInput
                  id="category-search"
                  placeholder="Buscar por nombre o rango"
                  value={filters.search}
                  onChange={handleSearchChange}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="category-limit">Elementos por página</CFormLabel>
              <CFormSelect id="category-limit" value={filters.limit} onChange={handleLimitChange}>
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
        </CForm>

        {error && (
          <CAlert color="danger" className="mb-4">
            {error}
          </CAlert>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <React.Fragment>
            <CTable responsive hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col">Categoría</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Rango de edad</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">
                    Configuración
                  </CTableHeaderCell>
                  {isAdmin && <CTableHeaderCell scope="col" className="text-end">Acciones</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedCategories.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={isAdmin ? 4 : 3} className="text-center py-4 text-body-secondary">
                      No se encontraron categorías con los filtros seleccionados.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedCategories.map((category) => (
                  <CTableRow key={category.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{category.name}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="fw-semibold">{formatAgeRange(category.data)}</div>
                      {category.data?.age_min !== null && category.data?.age_min !== undefined && (
                        <div className="text-body-secondary small">
                          Mínimo: {category.data.age_min}
                        </div>
                      )}
                      {category.data?.age_max !== null && category.data?.age_max !== undefined && (
                        <div className="text-body-secondary small">
                          Máximo: {category.data.age_max}
                        </div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      {category.data?.open_ended ? (
                        <CBadge color="info" shape="rounded-pill">
                          Abierta
                        </CBadge>
                      ) : (
                        <CBadge color="secondary" shape="rounded-pill">
                          Cerrada
                        </CBadge>
                      )}
                    </CTableDataCell>
                    {isAdmin && (
                      <CTableDataCell className="text-end">
                        <CButtonGroup role="group" aria-label="Acciones categoría">
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(category)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(category)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CButtonGroup>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {filteredCategories.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center" aria-label="Paginación de categorías">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  >
                    Anterior
                  </CPaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <CPaginationItem
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  >
                    Siguiente
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </React.Fragment>
        )}
      </CCardBody>

      <CategoryFormModal
        mode={formModalState.mode}
        visible={formModalState.visible}
        submitting={formSubmitting}
        onClose={closeFormModal}
        onSubmit={submitForm}
        category={formModalState.category}
      />

      <CategoryDeleteModal
        visible={deleteModalState.visible}
        category={deleteModalState.category}
        deleting={deleting}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </CCard>
  )
}

const SubcategoriesPanel = ({ isAdmin }) => {
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_TABLE_FILTERS }))
  const [feedback, setFeedback] = useState(null)
  const [formModalState, setFormModalState] = useState({ visible: false, mode: 'create', subcategory: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteModalState, setDeleteModalState] = useState({ visible: false, subcategory: null })
  const [deleting, setDeleting] = useState(false)

  const loadSubcategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listSubcategories()
      setSubcategories(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load subcategories', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron obtener las subcategorías'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubcategories()
  }, [loadSubcategories])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const sortedSubcategories = useMemo(() => {
    return [...subcategories].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
  }, [subcategories])

  const filteredSubcategories = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    if (!normalizedSearch) {
      return sortedSubcategories
    }
    return sortedSubcategories.filter((subcategory) => {
      const data = subcategory.data ?? {}
      const haystack = [
        subcategory.name,
        data.team_min,
        data.team_max,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => value.toString().toLowerCase())

      return haystack.some((value) => value.includes(normalizedSearch))
    })
  }, [filters.search, sortedSubcategories])

  const totalPages = Math.max(1, Math.ceil(filteredSubcategories.length / filters.limit || 1))
  const currentPage = Math.min(filters.page, totalPages)

  useEffect(() => {
    setFilters((prev) => {
      const safePage = Math.min(prev.page, totalPages)
      if (safePage === prev.page) {
        return prev
      }
      return { ...prev, page: safePage }
    })
  }, [totalPages])

  const paginatedSubcategories = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredSubcategories.slice(start, end)
  }, [currentPage, filteredSubcategories, filters.limit])

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }

  const handleLimitChange = (event) => {
    const value = Number(event.target.value)
    setFilters((prev) => ({ ...prev, limit: value, page: 1 }))
  }

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const openCreateModal = () => {
    setFormModalState({ visible: true, mode: 'create', subcategory: null })
  }

  const openEditModal = (subcategory) => {
    setFormModalState({ visible: true, mode: 'edit', subcategory })
  }

  const closeFormModal = () => {
    if (formSubmitting) {
      return
    }
    setFormModalState({ visible: false, mode: 'create', subcategory: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      if (formModalState.mode === 'edit' && formModalState.subcategory) {
        await updateSubcategory(formModalState.subcategory.id, payload)
        setFeedback({ type: 'success', message: 'Subcategoría actualizada correctamente' })
      } else {
        await createSubcategory(payload)
        setFeedback({ type: 'success', message: 'Subcategoría creada correctamente' })
      }
      setFormModalState({ visible: false, mode: 'create', subcategory: null })
      await loadSubcategories()
    } catch (requestError) {
      console.error('Subcategory submit failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar la subcategoría') })
    } finally {
      setFormSubmitting(false)
    }
  }

  const openDeleteModal = (subcategory) => {
    setDeleteModalState({ visible: true, subcategory })
  }

  const closeDeleteModal = () => {
    if (deleting) {
      return
    }
    setDeleteModalState({ visible: false, subcategory: null })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.subcategory) {
      return
    }
    setDeleting(true)
    setFeedback(null)
    try {
      await deleteSubcategory(deleteModalState.subcategory.id)
      setFeedback({ type: 'success', message: 'Subcategoría eliminada correctamente' })
      setDeleteModalState({ visible: false, subcategory: null })
      await loadSubcategories()
    } catch (requestError) {
      console.error('Subcategory delete failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar la subcategoría') })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-md-row align-items-md-center gap-2 justify-content-between">
        <div>
          <h5 className="mb-0">Subcategorías</h5>
          <small className="text-body-secondary">Tamaños de equipo independientes</small>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="ghost" onClick={loadSubcategories} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
          </CButton>
          {isAdmin && (
            <CButton color="primary" onClick={openCreateModal}>
              <CIcon icon={cilPlus} className="me-2" /> Nueva subcategoría
            </CButton>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {feedback && (
          <CAlert color={feedback.type} className="mb-4" dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}

        <CForm className="mb-4">
          <CRow className="g-3">
            <CCol xs={12} md={8}>
              <CFormLabel htmlFor="subcategory-search">Buscar</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilList} />
                </CInputGroupText>
                <CFormInput
                  id="subcategory-search"
                  placeholder="Buscar por nombre o rango"
                  value={filters.search}
                  onChange={handleSearchChange}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="subcategory-limit">Elementos por página</CFormLabel>
              <CFormSelect id="subcategory-limit" value={filters.limit} onChange={handleLimitChange}>
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
        </CForm>

        {error && (
          <CAlert color="danger" className="mb-4">
            {error}
          </CAlert>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <React.Fragment>
            <CTable responsive hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col">Subcategoría</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Tamaño del equipo</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">
                    Configuración
                  </CTableHeaderCell>
                  {isAdmin && <CTableHeaderCell scope="col" className="text-end">Acciones</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedSubcategories.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={isAdmin ? 4 : 3} className="text-center py-4 text-body-secondary">
                      No se encontraron subcategorías con los filtros seleccionados.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedSubcategories.map((subcategory) => (
                  <CTableRow key={subcategory.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{subcategory.name}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="fw-semibold">{formatTeamSizeRange(subcategory.data)}</div>
                      {subcategory.data?.team_min !== null && subcategory.data?.team_min !== undefined && (
                        <div className="text-body-secondary small">Mínimo: {subcategory.data.team_min ?? '—'}</div>
                      )}
                      {subcategory.data?.team_max !== null && subcategory.data?.team_max !== undefined && (
                        <div className="text-body-secondary small">Máximo: {subcategory.data.team_max ?? '—'}</div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      {subcategory.data?.open_ended ? (
                        <CBadge color="info" shape="rounded-pill">
                          Abierta
                        </CBadge>
                      ) : (
                        <CBadge color="secondary" shape="rounded-pill">
                          Cerrada
                        </CBadge>
                      )}
                    </CTableDataCell>
                    {isAdmin && (
                      <CTableDataCell className="text-end">
                        <CButtonGroup role="group" aria-label="Acciones subcategoría">
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(subcategory)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(subcategory)}
                          >
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CButtonGroup>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {filteredSubcategories.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center" aria-label="Paginación de subcategorías">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  >
                    Anterior
                  </CPaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <CPaginationItem
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  >
                    Siguiente
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </React.Fragment>
        )}
      </CCardBody>

      <SubcategoryFormModal
        mode={formModalState.mode}
        visible={formModalState.visible}
        submitting={formSubmitting}
        onClose={closeFormModal}
        onSubmit={submitForm}
        subcategory={formModalState.subcategory}
      />

      <SubcategoryDeleteModal
        visible={deleteModalState.visible}
        subcategory={deleteModalState.subcategory}
        deleting={deleting}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </CCard>
  )
}

const Categorias = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="d-flex flex-column gap-4">
      {!isAdmin && (
        <CAlert color="info">
          Puedes consultar las categorías y subcategorías disponibles, pero solo el equipo administrador puede crear, editar o eliminar registros.
        </CAlert>
      )}
      <CategoriesPanel isAdmin={isAdmin} />
      <SubcategoriesPanel isAdmin={isAdmin} />
    </div>
  )
}

export default Categorias
