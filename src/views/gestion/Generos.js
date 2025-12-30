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
  CFormTextarea,
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
  createMusicGenre,
  deleteMusicGenre,
  listMusicGenres,
  updateMusicGenre,
} from '../../services/musicGenresApi'

const LIMIT_OPTIONS = [5, 10, 25, 50]

const DEFAULT_FILTERS = {
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

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const stringifyMetadata = (value) => {
  if (!isPlainObject(value) || Object.keys(value).length === 0) {
    return ''
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    console.error('Unable to stringify metadata', error)
    return ''
  }
}

const formatMetadataValue = (value) => {
  if (value === null || typeof value === 'undefined') {
    return 'N/A'
  }
  if (typeof value === 'string') {
    return value.length > 36 ? `${value.slice(0, 33)}...` : value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return `[${value.length} elementos]`
  }
  if (isPlainObject(value)) {
    return '{...}'
  }
  return String(value)
}

const MetadataPreview = ({ data }) => {
  const entries = useMemo(() => {
    if (!isPlainObject(data)) {
      return []
    }
    return Object.entries(data)
  }, [data])

  if (entries.length === 0) {
    return <span className="text-body-secondary small">Sin metadatos</span>
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      {entries.slice(0, 4).map(([key, value]) => (
        <CBadge color="secondary" key={key} shape="rounded-pill">
          {key}: {formatMetadataValue(value)}
        </CBadge>
      ))}
      {entries.length > 4 && (
        <span className="text-body-secondary small">+{entries.length - 4} claves</span>
      )}
    </div>
  )
}

const GenreFormModal = ({ mode, visible, submitting, onClose, onSubmit, genre }) => {
  const isEditMode = mode === 'edit'

  const baseState = useMemo(
    () =>
      isEditMode && genre
        ? {
            name: genre.name ?? '',
            data: stringifyMetadata(genre.data),
          }
        : {
            name: '',
            data: '',
          },
    [genre, isEditMode],
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

  const validate = useCallback(() => {
    const nextErrors = {}
    const trimmedName = formState.name.trim()

    if (!trimmedName) {
      nextErrors.name = 'Ingresa un nombre'
    }

    let parsedData = {}
    const trimmedData = formState.data.trim()
    if (trimmedData) {
      try {
        const candidate = JSON.parse(trimmedData)
        if (!isPlainObject(candidate)) {
          nextErrors.data = 'Los metadatos deben ser un objeto JSON'
        } else {
          parsedData = candidate
        }
      } catch (error) {
        nextErrors.data = 'JSON inválido'
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
        data: parsedData,
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
        <CModalTitle>{isEditMode ? 'Editar género musical' : 'Nuevo género musical'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel htmlFor="genre-name">Nombre</CFormLabel>
              <CFormInput
                id="genre-name"
                value={formState.name}
                onChange={handleChange('name')}
                disabled={submitting}
                placeholder="Ej. Jazz Funk"
                autoFocus
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12}>
              <CFormLabel htmlFor="genre-data">Metadatos (JSON)</CFormLabel>
              <CFormTextarea
                id="genre-data"
                value={formState.data}
                onChange={handleChange('data')}
                disabled={submitting}
                rows={8}
                placeholder='{"color":"#FF6F61","translation":"Jazz"}'
              />
              <div className="form-text">
                Usa pares clave-valor para colores, traducciones u otras referencias (opcional).
              </div>
              {errors.data && <div className="invalid-feedback d-block">{errors.data}</div>}
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

const GenreDeleteModal = ({ visible, genre, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar género musical</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar el género <strong>{genre?.name}</strong>. Esta acción es permanente y
        podría afectar a coreografías existentes.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" /> Confirma solo si ya reasignaste las coreografías
        relacionadas.
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

const Generos = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS }))
  const [feedback, setFeedback] = useState(null)
  const [formModalState, setFormModalState] = useState({ visible: false, mode: 'create', genre: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteModalState, setDeleteModalState] = useState({ visible: false, genre: null })
  const [deleting, setDeleting] = useState(false)

  const loadGenres = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listMusicGenres()
      setGenres(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load music genres', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron obtener los géneros musicales'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGenres()
  }, [loadGenres])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const sortedGenres = useMemo(() => {
    return [...genres].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
  }, [genres])

  const filteredGenres = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()
    if (!normalizedSearch) {
      return sortedGenres
    }

    return sortedGenres.filter((genre) => {
      const metadata = isPlainObject(genre.data) ? genre.data : {}
      const metadataValues = Object.entries(metadata)
        .map(([key, value]) => `${key} ${value}`)
        .join(' ')
        .toLowerCase()

      const haystack = [genre.name ?? '', metadataValues]
      return haystack.some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [filters.search, sortedGenres])

  const totalPages = Math.max(1, Math.ceil(filteredGenres.length / filters.limit || 1))
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

  const paginatedGenres = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredGenres.slice(start, end)
  }, [currentPage, filteredGenres, filters.limit])

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
    setFormModalState({ visible: true, mode: 'create', genre: null })
  }

  const openEditModal = (genre) => {
    setFormModalState({ visible: true, mode: 'edit', genre })
  }

  const closeFormModal = () => {
    if (formSubmitting) {
      return
    }
    setFormModalState({ visible: false, mode: 'create', genre: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      if (formModalState.mode === 'edit' && formModalState.genre) {
        await updateMusicGenre(formModalState.genre.id, payload)
        setFeedback({ type: 'success', message: 'Género actualizado correctamente' })
      } else {
        await createMusicGenre(payload)
        setFeedback({ type: 'success', message: 'Género creado correctamente' })
      }
      setFormModalState({ visible: false, mode: 'create', genre: null })
      await loadGenres()
    } catch (requestError) {
      console.error('Genre submit failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar el género musical') })
    } finally {
      setFormSubmitting(false)
    }
  }

  const openDeleteModal = (genre) => {
    setDeleteModalState({ visible: true, genre })
  }

  const closeDeleteModal = () => {
    if (deleting) {
      return
    }
    setDeleteModalState({ visible: false, genre: null })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.genre) {
      return
    }
    setDeleting(true)
    setFeedback(null)
    try {
      await deleteMusicGenre(deleteModalState.genre.id)
      setFeedback({ type: 'success', message: 'Género eliminado correctamente' })
      setDeleteModalState({ visible: false, genre: null })
      await loadGenres()
    } catch (requestError) {
      console.error('Genre delete failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar el género musical') })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      {!isAdmin && (
        <CAlert color="info">
          Puedes consultar el catálogo de géneros musicales, pero solo el equipo administrador puede crear,
          editar o eliminar registros.
        </CAlert>
      )}

      <CCard>
        <CCardHeader className="d-flex flex-column flex-md-row align-items-md-center gap-2 justify-content-between">
          <div>
            <h5 className="mb-0">Géneros musicales</h5>
            <small className="text-body-secondary">
              Catálogo utilizado por las coreografías y formularios de registro
            </small>
          </div>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="ghost" onClick={loadGenres} disabled={loading}>
              {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
            </CButton>
            {isAdmin && (
              <CButton color="primary" onClick={openCreateModal}>
                <CIcon icon={cilPlus} className="me-2" /> Nuevo género
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
                <CFormLabel htmlFor="genre-search">Buscar</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilList} />
                  </CInputGroupText>
                  <CFormInput
                    id="genre-search"
                    placeholder="Buscar por nombre o metadatos"
                    value={filters.search}
                    onChange={handleSearchChange}
                  />
                </CInputGroup>
              </CCol>
              <CCol xs={12} md={4}>
                <CFormLabel htmlFor="genre-limit">Elementos por página</CFormLabel>
                <CFormSelect id="genre-limit" value={filters.limit} onChange={handleLimitChange}>
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
                    <CTableHeaderCell scope="col">Género</CTableHeaderCell>
                    {isAdmin && (
                      <CTableHeaderCell scope="col" className="text-end">
                        Acciones
                      </CTableHeaderCell>
                    )}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {paginatedGenres.length === 0 && (
                    <CTableRow>
                      <CTableDataCell
                        colSpan={isAdmin ? 2 : 1}
                        className="text-center py-4 text-body-secondary"
                      >
                        No se encontraron géneros con los filtros seleccionados.
                      </CTableDataCell>
                    </CTableRow>
                  )}

                  {paginatedGenres.map((genre) => (
                    <CTableRow key={genre.id}>
                      <CTableDataCell>
                        <div className="fw-semibold">{genre.name}</div>
                      </CTableDataCell>
                      {isAdmin && (
                        <CTableDataCell className="text-end">
                          <CButtonGroup role="group" aria-label="Acciones género musical">
                            <CButton
                              color="secondary"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(genre)}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(genre)}
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

              {filteredGenres.length > filters.limit && (
                <div className="d-flex justify-content-center">
                  <CPagination align="center" aria-label="Paginación de géneros musicales">
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

        <GenreFormModal
          mode={formModalState.mode}
          visible={formModalState.visible}
          submitting={formSubmitting}
          onClose={closeFormModal}
          onSubmit={submitForm}
          genre={formModalState.genre}
        />

        <GenreDeleteModal
          visible={deleteModalState.visible}
          genre={deleteModalState.genre}
          deleting={deleting}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      </CCard>
    </div>
  )
}

export default Generos
