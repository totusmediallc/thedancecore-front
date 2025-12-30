import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilClock,
  cilCloudUpload,
  cilExternalLink,
  cilList,
  cilLocationPin,
  cilMap,
  cilPencil,
  cilPeople,
  cilPlus,
  cilReload,
  cilTrash,
  cilWarning,
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
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
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

import { API_BASE_URL } from '../../config/apiConfig'
import { useAuth } from '../../hooks/useAuth'
import { listColonies, listMunicipalities, listStates } from '../../services/locationsApi'
import { createEvent, deleteEvent, listEvents, updateEvent } from '../../services/eventsApi'
import { HttpError } from '../../services/httpClient'
import EventAcademiesModal from './EventAcademiesModal'

const DEFAULT_FILTERS = {
  search: '',
  stateId: '',
  municipalityId: '',
  colonyId: '',
  status: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10,
}

const LIMIT_OPTIONS = [10, 20, 50]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Estado del evento: Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'open', label: 'Abierto para registro' },
  { value: 'closed', label: 'Registro cerrado' },
  { value: 'finished', label: 'Finalizado' },
]

// Opciones de estado para el formulario
const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador', color: 'secondary', description: 'El evento no es visible para academias' },
  { value: 'open', label: 'Abierto', color: 'success', description: 'Las academias pueden registrarse' },
  { value: 'closed', label: 'Cerrado', color: 'warning', description: 'El registro está cerrado' },
  { value: 'finished', label: 'Finalizado', color: 'dark', description: 'El evento ya terminó' },
]

const MAX_BANNER_SIZE = 12 * 1024 * 1024 // 12 MB
const ACCEPTED_BANNER_TYPES = ['image/jpeg', 'image/png']
const OPTIMIZED_BANNER_DIMENSIONS = {
  maxWidth: 1600,
  maxHeight: 900,
  quality: 0.9,
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

const formatDateTime = (value, options = {}) => {
  if (!value) {
    return '—'
  }

  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options,
    }).format(date)
  } catch (error) {
    console.error('Unable to format date', error)
    return '—'
  }
}

const formatDateRange = (start, end) => {
  if (!start && !end) {
    return 'Sin fecha definida'
  }

  if (start && !end) {
    return `Desde ${formatDateTime(start)}`
  }

  if (!start && end) {
    return `Hasta ${formatDateTime(end)}`
  }

  return `${formatDateTime(start)} · ${formatDateTime(end)}`
}

const toInputDateTimeValue = (value) => {
  if (!value) {
    return ''
  }

  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    const offset = date.getTimezoneOffset()
    const localValue = new Date(date.getTime() - offset * 60 * 1000)
    return localValue.toISOString().slice(0, 16)
  } catch (error) {
    console.error('Unable to convert date to input value', error)
    return ''
  }
}

const toIsoString = (value) => {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date.toISOString()
}

const API_PUBLIC_BASE_URL = API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '')

const buildBannerUrl = (path) => {
  if (!path) {
    return null
  }

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_PUBLIC_BASE_URL}${normalized}`
}

const getEventStatus = (event) => {
  // Si el evento tiene un status definido, usarlo directamente
  if (event?.status) {
    return event.status
  }
  
  // Fallback: calcular basado en fechas (para compatibilidad)
  const now = Date.now()
  const start = event?.startDate ? new Date(event.startDate).getTime() : null
  const end = event?.endDate ? new Date(event.endDate).getTime() : null

  if (start && end) {
    if (now < start) {
      return 'draft'
    }
    if (now >= start && now <= end) {
      return 'open'
    }
    if (now > end) {
      return 'finished'
    }
  }

  return 'draft'
}

const getStatusBadgeProps = (status) => {
  switch (status) {
    case 'open':
      return { color: 'success', text: 'Abierto' }
    case 'closed':
      return { color: 'warning', text: 'Cerrado' }
    case 'finished':
      return { color: 'dark', text: 'Finalizado' }
    case 'draft':
    default:
      return { color: 'secondary', text: 'Borrador' }
  }
}

const resizeImageFile = (file, { maxWidth, maxHeight, quality }) => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = image

      if (!maxWidth || !maxHeight || (width <= maxWidth && height <= maxHeight)) {
        resolve(file)
        return
      }

      const widthRatio = maxWidth / width
      const heightRatio = maxHeight / height
      const ratio = Math.min(widthRatio, heightRatio)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas context is not available'))
        return
      }

      context.drawImage(image, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Unable to optimize image'))
            return
          }

          const optimizedFile = new File([blob], file.name, {
            type: blob.type,
            lastModified: Date.now(),
          })
          resolve(optimizedFile)
        },
        file.type,
        quality ?? 0.92,
      )
    }

    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(error)
    }

    image.src = objectUrl
  })
}

const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return ''
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const EventFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  event: currentEvent,
  isAdmin,
  submitError,
}) => {
  const isEditMode = mode === 'edit'

  const initialLocation = useMemo(() => {
    if (!isEditMode || !currentEvent?.colony) {
      return {
        state: null,
        municipality: null,
        colony: null,
      }
    }

    const colony = currentEvent.colony
    const municipality = colony.municipality ?? null
    const state = municipality?.state ?? null

    return {
      state,
      municipality,
      colony,
    }
  }, [currentEvent, isEditMode])

  const baseState = useMemo(() => {
    if (isEditMode && currentEvent) {
      return {
        name: currentEvent.name ?? '',
        place: currentEvent.place ?? '',
        address: currentEvent.address ?? '',
        startDate: toInputDateTimeValue(currentEvent.startDate),
        endDate: toInputDateTimeValue(currentEvent.endDate),
        status: currentEvent.status ?? 'draft',
        registrationStartDate: toInputDateTimeValue(currentEvent.registrationStartDate),
        registrationEndDate: toInputDateTimeValue(currentEvent.registrationEndDate),
        updateDeadlineDate: toInputDateTimeValue(currentEvent.updateDeadlineDate),
        stateId: initialLocation.state?.id ? String(initialLocation.state.id) : '',
        municipalityId: initialLocation.municipality?.id
          ? String(initialLocation.municipality.id)
          : '',
        colonyId: initialLocation.colony?.id ? String(initialLocation.colony.id) : '',
      }
    }

    return {
      name: '',
      place: '',
      address: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      registrationStartDate: '',
      registrationEndDate: '',
      updateDeadlineDate: '',
      stateId: '',
      municipalityId: '',
      colonyId: '',
    }
  }, [currentEvent, initialLocation, isEditMode])

  const persistedBannerUrl = useMemo(
    () => buildBannerUrl(currentEvent?.banner),
    [currentEvent?.banner],
  )

  const [formState, setFormState] = useState(baseState)
  const [errors, setErrors] = useState({})

  const [states, setStates] = useState([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [statesError, setStatesError] = useState(null)

  const [municipalities, setMunicipalities] = useState([])
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false)
  const [municipalitiesError, setMunicipalitiesError] = useState(null)
  const [municipalitySearch, setMunicipalitySearch] = useState('')

  const [colonies, setColonies] = useState([])
  const [coloniesLoading, setColoniesLoading] = useState(false)
  const [coloniesError, setColoniesError] = useState(null)
  const [colonySearch, setColonySearch] = useState('')
  const [selectedColonySnapshot, setSelectedColonySnapshot] = useState(
    initialLocation.colony ?? null,
  )

  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(persistedBannerUrl)
  const [bannerError, setBannerError] = useState(null)
  const [optimizeBanner, setOptimizeBanner] = useState(true)
  const [bannerProcessing, setBannerProcessing] = useState(false)

  const fileInputRef = useRef(null)
  const bannerObjectUrlRef = useRef(null)

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
      setMunicipalitySearch('')
      setColonySearch('')
      setSelectedColonySnapshot(initialLocation.colony ?? null)
      setBannerFile(null)
      setBannerError(null)
      setBannerProcessing(false)
      setOptimizeBanner(true)
      setBannerPreview(persistedBannerUrl)
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current)
        bannerObjectUrlRef.current = null
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [baseState, initialLocation, persistedBannerUrl, visible])

  useEffect(() => {
    return () => {
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current)
      }
    }
  }, [])

  const loadStates = useCallback(async () => {
    setStatesLoading(true)
    setStatesError(null)
    try {
      const response = await listStates({ countryId: 1 })
      setStates(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Unable to load states', error)
      setStatesError(getErrorMessage(error, 'No se pudieron cargar los estados'))
    } finally {
      setStatesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!visible) {
      return
    }

    loadStates()
  }, [loadStates, visible])

  useEffect(() => {
    if (!visible) {
      return
    }

    if (!formState.stateId) {
      setMunicipalities([])
      setMunicipalitySearch('')
      setMunicipalitiesError(null)
      return
    }

    let isMounted = true
    setMunicipalitiesLoading(true)
    setMunicipalitiesError(null)

    ;(async () => {
      try {
        const response = await listMunicipalities({ stateId: formState.stateId })
        if (!isMounted) {
          return
        }
        const items = Array.isArray(response) ? response : []
        const sorted = [...items].sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '', 'es'),
        )
        setMunicipalities(sorted)
      } catch (error) {
        if (isMounted) {
          console.error('Unable to load municipalities', error)
          setMunicipalitiesError(
            getErrorMessage(error, 'No se pudieron cargar los municipios'),
          )
          setMunicipalities([])
        }
      } finally {
        if (isMounted) {
          setMunicipalitiesLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [formState.stateId, visible])

  useEffect(() => {
    if (!visible) {
      return
    }

    if (!formState.municipalityId) {
      setColonies([])
      setColoniesError(null)
      setColonySearch('')
      return
    }

    let isCancelled = false
    setColoniesLoading(true)
    setColoniesError(null)

    const timeoutId = setTimeout(async () => {
      try {
        const response = await listColonies({
          municipalityId: formState.municipalityId,
          search: colonySearch.trim() || undefined,
        })
        if (isCancelled) {
          return
        }
        const items = Array.isArray(response) ? response : []
        let merged = [...items]

        const candidate = (() => {
          if (!formState.colonyId) {
            return selectedColonySnapshot
          }

          const directMatch = merged.find(
            (colony) => String(colony.id) === formState.colonyId,
          )
          if (directMatch) {
            return directMatch
          }

          if (
            selectedColonySnapshot &&
            String(
              selectedColonySnapshot.municipalityId ?? selectedColonySnapshot.municipality?.id ?? '',
            ) === formState.municipalityId &&
            String(selectedColonySnapshot.id) === formState.colonyId
          ) {
            return selectedColonySnapshot
          }

          if (
            initialLocation.colony &&
            String(initialLocation.colony.id) === formState.colonyId &&
            String(
              initialLocation.colony.municipalityId ?? initialLocation.municipality?.id ?? '',
            ) === formState.municipalityId
          ) {
            return initialLocation.colony
          }

          return null
        })()

        if (
          candidate &&
          String(candidate.municipalityId ?? candidate.municipality?.id ?? '') ===
            formState.municipalityId &&
          !merged.some((colony) => colony.id === candidate.id)
        ) {
          merged.push(candidate)
        }

        merged.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
        setColonies(merged)
      } catch (error) {
        if (!isCancelled) {
          console.error('Unable to load colonies', error)
          setColoniesError(getErrorMessage(error, 'No se pudieron cargar las colonias'))
          setColonies([])
        }
      } finally {
        if (!isCancelled) {
          setColoniesLoading(false)
        }
      }
    }, 300)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [
    colonySearch,
    formState.colonyId,
    formState.municipalityId,
    initialLocation,
    selectedColonySnapshot,
    visible,
  ])

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es')),
    [states],
  )

  const filteredMunicipalities = useMemo(() => {
    const normalized = municipalitySearch.trim().toLowerCase()
    if (!normalized) {
      return municipalities
    }
    return municipalities.filter((municipality) =>
      municipality.name?.toLowerCase().includes(normalized),
    )
  }, [municipalities, municipalitySearch])

  const filteredColonies = useMemo(() => {
    const normalized = colonySearch.trim().toLowerCase()
    if (!normalized) {
      return colonies
    }
    return colonies.filter((colony) => colony.name?.toLowerCase().includes(normalized))
  }, [colonies, colonySearch])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleStateChange = (event) => {
    const value = event.target.value
    setFormState((prev) => ({
      ...prev,
      stateId: value,
      municipalityId: '',
      colonyId: '',
    }))
    setMunicipalitySearch('')
    setMunicipalitiesError(null)
    setColonies([])
    setColoniesError(null)
    setColonySearch('')
    setSelectedColonySnapshot(null)
  }

  const handleMunicipalityChange = (event) => {
    const value = event.target.value
    setFormState((prev) => ({
      ...prev,
      municipalityId: value,
      colonyId: '',
    }))
    setColonies([])
    setColoniesError(null)
    setColonySearch('')
    setSelectedColonySnapshot(null)
  }

  const handleColonyChange = (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, colonyId: value }))
    if (!value) {
      setSelectedColonySnapshot(null)
      return
    }

    const matchFromList = colonies.find((colony) => String(colony.id) === value)
    if (matchFromList) {
      setSelectedColonySnapshot(matchFromList)
      return
    }

    if (initialLocation.colony && String(initialLocation.colony.id) === value) {
      setSelectedColonySnapshot(initialLocation.colony)
    }
  }

  const handleBannerChange = async (event) => {
    const file = event.target.files?.[0]
    setBannerError(null)

    if (!file) {
      setBannerFile(null)
      setBannerPreview(persistedBannerUrl)
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current)
        bannerObjectUrlRef.current = null
      }
      return
    }

    if (!ACCEPTED_BANNER_TYPES.includes(file.type)) {
      setBannerError('Formato no soportado. Usa JPG o PNG.')
      return
    }

    if (file.size > MAX_BANNER_SIZE) {
      setBannerError('El banner no puede superar los 12 MB.')
      return
    }

    setBannerProcessing(true)
    try {
      const processedFile = optimizeBanner
        ? await resizeImageFile(file, OPTIMIZED_BANNER_DIMENSIONS)
        : file
      setBannerFile(processedFile)

      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current)
      }
      const previewUrl = URL.createObjectURL(processedFile)
      bannerObjectUrlRef.current = previewUrl
      setBannerPreview(previewUrl)
    } catch (error) {
      console.error('Unable to process banner', error)
      setBannerError('No se pudo procesar el banner seleccionado.')
      setBannerFile(null)
      setBannerPreview(persistedBannerUrl)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setBannerProcessing(false)
    }
  }

  const handleClearBanner = () => {
    setBannerFile(null)
    setBannerPreview(persistedBannerUrl)
    setBannerError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current)
      bannerObjectUrlRef.current = null
    }
  }

  const validate = useCallback(() => {
    const nextErrors = {}

    if (!formState.name.trim()) {
      nextErrors.name = 'El nombre del evento es obligatorio.'
    }

    if (!formState.place.trim()) {
      nextErrors.place = 'Indica la sede o venue del evento.'
    }

    if (!formState.startDate) {
      nextErrors.startDate = 'Define la fecha de inicio.'
    }

    if (!formState.endDate) {
      nextErrors.endDate = 'Define la fecha de cierre.'
    }

    if (formState.startDate && formState.endDate) {
      const start = new Date(formState.startDate)
      const end = new Date(formState.endDate)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start > end) {
        nextErrors.endDate = 'La fecha de cierre debe ser posterior a la inicial.'
      }
    }

    if (!formState.stateId) {
      nextErrors.stateId = 'Selecciona un estado.'
    }

    if (!formState.municipalityId) {
      nextErrors.municipalityId = 'Selecciona un municipio.'
    }

    if (!formState.colonyId) {
      nextErrors.colonyId = 'Selecciona una colonia.'
    }

    setErrors(nextErrors)
    return nextErrors
  }, [formState])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isAdmin || submitting) {
      return
    }

    const validation = validate()
    if (Object.keys(validation).length > 0) {
      return
    }

    const payload = {
      name: formState.name.trim(),
      place: formState.place.trim(),
      startDate: toIsoString(formState.startDate),
      endDate: toIsoString(formState.endDate),
      status: formState.status,
      colonyId: formState.colonyId,
    }

    // Fechas de registro (opcionales)
    if (formState.registrationStartDate) {
      payload.registrationStartDate = toIsoString(formState.registrationStartDate)
    }
    if (formState.registrationEndDate) {
      payload.registrationEndDate = toIsoString(formState.registrationEndDate)
    }
    if (formState.updateDeadlineDate) {
      payload.updateDeadlineDate = toIsoString(formState.updateDeadlineDate)
    }

    if (formState.address.trim()) {
      payload.address = formState.address.trim()
    }

    if (bannerFile) {
      payload.banner = bannerFile
    }

    onSubmit(payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="xl" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>{isEditMode ? 'Editar evento' : 'Registrar nuevo evento'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody className="py-4">
          {!isAdmin && (
            <CAlert color="info" className="mb-3">
              Solo administradores pueden crear o editar eventos.
            </CAlert>
          )}
          {submitError && (
            <CAlert color="danger" className="mb-3">
              {submitError}
            </CAlert>
          )}
          <CRow className="g-4">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-name">Nombre del evento</CFormLabel>
              <CFormInput
                id="event-name"
                value={formState.name}
                onChange={handleChange('name')}
                required
                invalid={Boolean(errors.name)}
                disabled={submitting || !isAdmin}
                placeholder="Ej: Summer Dance Core"
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-place">Sede</CFormLabel>
              <CFormInput
                id="event-place"
                value={formState.place}
                onChange={handleChange('place')}
                required
                invalid={Boolean(errors.place)}
                disabled={submitting || !isAdmin}
                placeholder="Auditorio, Centro de eventos, etc."
              />
              {errors.place && <div className="invalid-feedback d-block">{errors.place}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-start">Inicio</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilCalendar} />
                </CInputGroupText>
                <CFormInput
                  id="event-start"
                  type="datetime-local"
                  value={formState.startDate}
                  onChange={handleChange('startDate')}
                  required
                  invalid={Boolean(errors.startDate)}
                  disabled={submitting || !isAdmin}
                />
              </CInputGroup>
              {errors.startDate && (
                <div className="invalid-feedback d-block">{errors.startDate}</div>
              )}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-end">Cierre</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilClock} />
                </CInputGroupText>
                <CFormInput
                  id="event-end"
                  type="datetime-local"
                  value={formState.endDate}
                  onChange={handleChange('endDate')}
                  required
                  invalid={Boolean(errors.endDate)}
                  disabled={submitting || !isAdmin}
                />
              </CInputGroup>
              {errors.endDate && <div className="invalid-feedback d-block">{errors.endDate}</div>}
            </CCol>

            {/* Sección de Estado y Registro */}
            <CCol xs={12}>
              <hr className="my-2" />
              <h6 className="text-body-secondary mb-3">
                <CIcon icon={cilCheckCircle} className="me-2" />
                Estado del Evento y Registro
              </h6>
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-status">Estado del evento</CFormLabel>
              <CFormSelect
                id="event-status"
                value={formState.status}
                onChange={handleChange('status')}
                disabled={submitting || !isAdmin}
              >
                {EVENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </CFormSelect>
              <div className="form-text">
                Solo cuando esté "Abierto" las academias podrán registrarse.
              </div>
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-registration-start">Inicio de registro</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilCalendar} />
                </CInputGroupText>
                <CFormInput
                  id="event-registration-start"
                  type="datetime-local"
                  value={formState.registrationStartDate}
                  onChange={handleChange('registrationStartDate')}
                  disabled={submitting || !isAdmin}
                />
              </CInputGroup>
              <div className="form-text">Fecha desde la cual se acepta el registro.</div>
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-registration-end">Fin de registro</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilClock} />
                </CInputGroupText>
                <CFormInput
                  id="event-registration-end"
                  type="datetime-local"
                  value={formState.registrationEndDate}
                  onChange={handleChange('registrationEndDate')}
                  disabled={submitting || !isAdmin}
                />
              </CInputGroup>
              <div className="form-text">Fecha límite para nuevos registros.</div>
            </CCol>

            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="event-update-deadline">Límite de modificaciones</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilWarning} />
                </CInputGroupText>
                <CFormInput
                  id="event-update-deadline"
                  type="datetime-local"
                  value={formState.updateDeadlineDate}
                  onChange={handleChange('updateDeadlineDate')}
                  disabled={submitting || !isAdmin}
                />
              </CInputGroup>
              <div className="form-text">Después de esta fecha, las academias no podrán modificar su registro.</div>
            </CCol>

            <CCol xs={12}>
              <hr className="my-2" />
              <h6 className="text-body-secondary mb-3">
                <CIcon icon={cilLocationPin} className="me-2" />
                Ubicación
              </h6>
            </CCol>

            <CCol xs={12}>
              <CFormLabel htmlFor="event-address">Dirección detallada</CFormLabel>
              <CFormInput
                id="event-address"
                value={formState.address}
                onChange={handleChange('address')}
                disabled={submitting || !isAdmin}
                placeholder="Calle, número, referencias (opcional)"
              />
            </CCol>
            <CCol xs={12}>
              <CRow className="g-3">
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="event-state">Estado</CFormLabel>
                  <CFormSelect
                    id="event-state"
                    value={formState.stateId}
                    onChange={handleStateChange}
                    invalid={Boolean(errors.stateId)}
                    disabled={submitting || statesLoading || !isAdmin}
                  >
                    <option value="">Selecciona un estado</option>
                    {sortedStates.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </CFormSelect>
                  {statesLoading && (
                    <div className="small text-body-secondary mt-1 d-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Cargando estados…
                    </div>
                  )}
                  {statesError && <div className="invalid-feedback d-block">{statesError}</div>}
                  {errors.stateId && (
                    <div className="invalid-feedback d-block">{errors.stateId}</div>
                  )}
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="event-municipality">Municipio</CFormLabel>
                  <CFormInput
                    id="event-municipality-search"
                    type="search"
                    placeholder="Filtrar municipio"
                    value={municipalitySearch}
                    onChange={(event) => setMunicipalitySearch(event.target.value)}
                    disabled={!formState.stateId || municipalitiesLoading || submitting || !isAdmin}
                  />
                  <CFormSelect
                    id="event-municipality"
                    className="mt-2"
                    value={formState.municipalityId}
                    onChange={handleMunicipalityChange}
                    invalid={Boolean(errors.municipalityId)}
                    disabled={!formState.stateId || municipalitiesLoading || submitting || !isAdmin}
                  >
                    <option value="">Selecciona un municipio</option>
                    {filteredMunicipalities.map((municipality) => (
                      <option key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </option>
                    ))}
                  </CFormSelect>
                  {!municipalitiesLoading &&
                    formState.stateId &&
                    filteredMunicipalities.length === 0 && (
                      <div className="small text-body-secondary mt-1">Sin coincidencias</div>
                    )}
                  {municipalitiesLoading && (
                    <div className="small text-body-secondary mt-1 d-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Cargando municipios…
                    </div>
                  )}
                  {municipalitiesError && (
                    <div className="invalid-feedback d-block">{municipalitiesError}</div>
                  )}
                  {errors.municipalityId && (
                    <div className="invalid-feedback d-block">{errors.municipalityId}</div>
                  )}
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="event-colony">Colonia</CFormLabel>
                  <CFormInput
                    id="event-colony-search"
                    type="search"
                    placeholder="Buscar colonia"
                    value={colonySearch}
                    onChange={(event) => setColonySearch(event.target.value)}
                    disabled={!formState.municipalityId || coloniesLoading || submitting || !isAdmin}
                  />
                  <CFormSelect
                    id="event-colony"
                    className="mt-2"
                    value={formState.colonyId}
                    onChange={handleColonyChange}
                    invalid={Boolean(errors.colonyId)}
                    disabled={!formState.municipalityId || coloniesLoading || submitting || !isAdmin}
                  >
                    <option value="">Selecciona una colonia</option>
                    {filteredColonies.map((colony) => (
                      <option key={colony.id} value={colony.id}>
                        {colony.name}
                      </option>
                    ))}
                  </CFormSelect>
                  {!coloniesLoading &&
                    formState.municipalityId &&
                    filteredColonies.length === 0 && (
                      <div className="small text-body-secondary mt-1">Sin coincidencias</div>
                    )}
                  {coloniesLoading && (
                    <div className="small text-body-secondary mt-1 d-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Buscando colonias…
                    </div>
                  )}
                  {coloniesError && (
                    <div className="invalid-feedback d-block">{coloniesError}</div>
                  )}
                  {errors.colonyId && (
                    <div className="invalid-feedback d-block">{errors.colonyId}</div>
                  )}
                </CCol>
              </CRow>
            </CCol>
            <CCol xs={12}>
              <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
                <div>
                  <CFormLabel htmlFor="event-banner">Banner principal</CFormLabel>
                  <div className="small text-body-secondary">
                    JPG o PNG, máximo 12 MB. Se recomienda proporción 16:9.
                  </div>
                </div>
                <CFormSwitch
                  id="event-banner-optimize"
                  label="Optimizar automáticamente"
                  checked={optimizeBanner}
                  onChange={() => setOptimizeBanner((prev) => !prev)}
                  disabled={submitting || !isAdmin || bannerProcessing}
                />
              </div>
              <CInputGroup className="mb-2">
                <CInputGroupText>
                  <CIcon icon={cilCloudUpload} />
                </CInputGroupText>
                <CFormInput
                  id="event-banner"
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleBannerChange}
                  disabled={submitting || bannerProcessing || !isAdmin}
                  ref={fileInputRef}
                />
              </CInputGroup>
              {bannerError && <div className="invalid-feedback d-block">{bannerError}</div>}
              {bannerProcessing && (
                <div className="small text-body-secondary d-flex align-items-center gap-2 mb-2">
                  <CSpinner size="sm" /> Optimizando banner…
                </div>
              )}
              {(bannerPreview || persistedBannerUrl) && (
                <div className="border rounded-3 p-3 bg-body-tertiary">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold">Vista previa</div>
                    {bannerFile && (
                      <CButton
                        color="secondary"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearBanner}
                        disabled={submitting}
                      >
                        Quitar banner
                      </CButton>
                    )}
                  </div>
                  <div className="ratio ratio-16x9 bg-body shadow-sm rounded overflow-hidden">
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Vista previa del banner"
                        className="w-100 h-100 object-fit-cover"
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center text-body-secondary">
                        Sin banner cargado
                      </div>
                    )}
                  </div>
                  {bannerFile && (
                    <div className="small text-body-secondary mt-2">
                      Archivo listo para subir · {bannerFile.name} · {formatFileSize(bannerFile.size)}
                    </div>
                  )}
                  {!bannerFile && persistedBannerUrl && (
                    <div className="small text-body-secondary mt-2">
                      Se conservará el banner actual mientras no cargues uno nuevo.
                    </div>
                  )}
                </div>
              )}
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          {isAdmin && (
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}{' '}
              {isEditMode ? 'Guardar cambios' : 'Crear evento'}
            </CButton>
          )}
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const DeleteEventModal = ({ visible, event, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar evento</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar el evento <strong>{event?.name}</strong>. Esta acción es permanente y
        eliminará relaciones dependientes.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" /> Verifica que no existan coreografías o pedidos pendientes antes de continuar.
      </CAlert>
    </CModalBody>
    <CModalFooter className="bg-body-tertiary justify-content-between">
      <CButton color="secondary" variant="ghost" onClick={onClose} disabled={deleting}>
        Cancelar
      </CButton>
      <CButton color="danger" onClick={onConfirm} disabled={deleting}>
        {deleting && <CSpinner size="sm" className="me-2" />}{' '}Eliminar definitivamente
      </CButton>
    </CModalFooter>
  </CModal>
)

const buildMapsSearchUrl = (event) => {
  if (!event) {
    return null
  }

  const parts = [
    event.address,
    event.place,
    event.colony?.name,
    event.colony?.municipality?.name,
    event.colony?.municipality?.state?.name,
  ].filter(Boolean)

  if (parts.length === 0) {
    return null
  }

  const query = encodeURIComponent(parts.join(', '))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

const EventsManagement = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [feedback, setFeedback] = useState(null)

  const [formModalState, setFormModalState] = useState({
    visible: false,
    mode: 'create',
    event: null,
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteModalState, setDeleteModalState] = useState({ visible: false, event: null })
  const [deleting, setDeleting] = useState(false)

  // Estado para modal de academias
  const [academiesModalState, setAcademiesModalState] = useState({ visible: false, event: null })

  const openAcademiesModal = useCallback((event) => {
    setAcademiesModalState({ visible: true, event })
  }, [])

  const closeAcademiesModal = useCallback(() => {
    setAcademiesModalState({ visible: false, event: null })
  }, [])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listEvents()
      setEvents(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load events', requestError)
      setError(getErrorMessage(requestError, 'No se pudo cargar la lista de eventos'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeoutId = setTimeout(() => setFeedback(null), 6000)
    return () => clearTimeout(timeoutId)
  }, [feedback])

  const stateFilterOptions = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      const state = event.colony?.municipality?.state
      if (state?.id) {
        map.set(String(state.id), state.name ?? `Estado #${state.id}`)
      }
    })
    const options = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    return [{ value: '', label: 'Estado: Todos' }, ...options]
  }, [events])

  const municipalityFilterOptions = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      const municipality = event.colony?.municipality
      if (!municipality?.id) {
        return
      }
      const stateId = municipality.state?.id ? String(municipality.state.id) : ''
      if (filters.stateId && stateId !== filters.stateId) {
        return
      }
      map.set(String(municipality.id), municipality.name ?? `Municipio #${municipality.id}`)
    })
    const options = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    return [{ value: '', label: 'Municipio: Todos' }, ...options]
  }, [events, filters.stateId])

  const colonyFilterOptions = useMemo(() => {
    const map = new Map()
    events.forEach((event) => {
      const colony = event.colony
      if (!colony?.id) {
        return
      }

      const municipalityId = colony.municipality?.id
        ? String(colony.municipality.id)
        : String(colony.municipalityId ?? '')
      const stateId = colony.municipality?.state?.id
        ? String(colony.municipality.state.id)
        : ''

      if (filters.stateId && stateId !== filters.stateId) {
        return
      }

      if (filters.municipalityId && municipalityId !== filters.municipalityId) {
        return
      }

      map.set(String(colony.id), colony.name ?? `Colonia #${colony.id}`)
    })
    const options = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    return [{ value: '', label: 'Colonia: Todas' }, ...options]
  }, [events, filters.municipalityId, filters.stateId])

  const filteredEvents = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()

    return events.filter((event) => {
      if (normalizedSearch) {
        const haystack = [
          event.name,
          event.place,
          event.address,
          event.colony?.name,
          event.colony?.municipality?.name,
          event.colony?.municipality?.state?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(normalizedSearch)) {
          return false
        }
      }

      if (filters.stateId) {
        const stateId = event.colony?.municipality?.state?.id
        if (String(stateId ?? '') !== filters.stateId) {
          return false
        }
      }

      if (filters.municipalityId) {
        const municipalityId = event.colony?.municipality?.id
        if (String(municipalityId ?? '') !== filters.municipalityId) {
          return false
        }
      }

      if (filters.colonyId) {
        if (String(event.colony?.id ?? '') !== filters.colonyId) {
          return false
        }
      }

      if (filters.status && getEventStatus(event) !== filters.status) {
        return false
      }

      if (filters.startDate) {
        const from = new Date(filters.startDate)
        if (!Number.isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0)
          const eventStart = event.startDate ? new Date(event.startDate) : null
          if (!eventStart || eventStart < from) {
            return false
          }
        }
      }

      if (filters.endDate) {
        const to = new Date(filters.endDate)
        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999)
          const eventEnd = event.endDate ? new Date(event.endDate) : null
          if (!eventEnd || eventEnd > to) {
            return false
          }
        }
      }

      return true
    })
  }, [events, filters])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    return filteredEvents.slice(start, start + filters.limit)
  }, [filteredEvents, currentPage, filters.limit])

  useEffect(() => {
    if (filters.page !== currentPage) {
      setFilters((prev) => ({ ...prev, page: currentPage }))
    }
  }, [currentPage, filters.page])

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value
    setFilters((prev) => {
      const next = { ...prev, [field]: field === 'limit' ? Number(value) || prev.limit : value }

      if (field === 'stateId') {
        next.municipalityId = ''
        next.colonyId = ''
      }

      if (field === 'municipalityId') {
        next.colonyId = ''
      }

      next.page = 1
      return next
    })
  }

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const openCreateModal = () => {
    if (!isAdmin) {
      return
    }
    setFormModalState({ visible: true, mode: 'create', event: null })
    setFormError(null)
  }

  const openEditModal = (eventItem) => {
    setFormModalState({ visible: true, mode: 'edit', event: eventItem })
    setFormError(null)
  }

  const closeFormModal = () => {
    setFormModalState({ visible: false, mode: 'create', event: null })
    setFormError(null)
  }

  const openDeleteModal = (eventItem) => {
    setDeleteModalState({ visible: true, event: eventItem })
  }

  const closeDeleteModal = () => {
    setDeleteModalState({ visible: false, event: null })
  }

  const submitForm = async (payload) => {
    if (!isAdmin) {
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      if (formModalState.mode === 'edit' && formModalState.event?.id) {
        await updateEvent(formModalState.event.id, payload)
        setFeedback({ type: 'success', message: 'Evento actualizado correctamente.' })
      } else {
        await createEvent(payload)
        setFeedback({ type: 'success', message: 'Evento creado correctamente.' })
      }
      closeFormModal()
      await loadEvents()
    } catch (error) {
      const message = getErrorMessage(error, 'No se pudo guardar el evento')
      setFormError(message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteModalState.event?.id) {
      return
    }
    setDeleting(true)
    try {
      await deleteEvent(deleteModalState.event.id)
      setFeedback({ type: 'success', message: 'Evento eliminado correctamente.' })
      closeDeleteModal()
      await loadEvents()
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: getErrorMessage(error, 'No se pudo eliminar el evento'),
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-md-row align-items-md-center gap-2 justify-content-between">
        <div>
          <h5 className="mb-0">Eventos</h5>
          <small className="text-body-secondary">
            Administra fechas clave, sedes y banners oficiales de la agencia.
          </small>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="ghost" onClick={loadEvents} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
          </CButton>
          {isAdmin && (
            <CButton color="primary" onClick={openCreateModal} disabled={loading}>
              <CIcon icon={cilPlus} className="me-2" /> Nuevo evento
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

        {!isAdmin && (
          <CAlert color="info" className="mb-4">
            Puedes consultar el detalle de los eventos, pero solo el equipo administrador puede crear,
            editar o eliminar registros.
          </CAlert>
        )}

        <CForm className="mb-4">
          <CRow className="g-3">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-search">Buscar</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilList} />
                </CInputGroupText>
                <CFormInput
                  id="events-search"
                  placeholder="Nombre, sede, ubicación"
                  value={filters.search}
                  onChange={handleSearchChange}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-state-filter">Estado</CFormLabel>
              <CFormSelect
                id="events-state-filter"
                value={filters.stateId}
                onChange={handleFilterChange('stateId')}
              >
                {stateFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-municipality-filter">Municipio</CFormLabel>
              <CFormSelect
                id="events-municipality-filter"
                value={filters.municipalityId}
                onChange={handleFilterChange('municipalityId')}
                disabled={municipalityFilterOptions.length <= 1}
              >
                {municipalityFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
          <CRow className="g-3 mt-1">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-colony-filter">Colonia</CFormLabel>
              <CFormSelect
                id="events-colony-filter"
                value={filters.colonyId}
                onChange={handleFilterChange('colonyId')}
                disabled={colonyFilterOptions.length <= 1}
              >
                {colonyFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-start-filter">Desde</CFormLabel>
              <CFormInput
                id="events-start-filter"
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-end-filter">Hasta</CFormLabel>
              <CFormInput
                id="events-end-filter"
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
              />
            </CCol>
          </CRow>
          <CRow className="g-3 mt-1">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-status-filter">Estado del evento</CFormLabel>
              <CFormSelect
                id="events-status-filter"
                value={filters.status}
                onChange={handleFilterChange('status')}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="events-limit">Elementos por página</CFormLabel>
              <CFormSelect
                id="events-limit"
                value={filters.limit}
                onChange={handleFilterChange('limit')}
              >
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
            <CTable responsive="md" hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col">Evento</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Agenda</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Ubicación</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Banner</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-end">
                    Acciones
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedEvents.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={5} className="text-center py-4 text-body-secondary">
                      No se encontraron eventos con los filtros seleccionados.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedEvents.map((event) => {
                  const bannerUrl = buildBannerUrl(event.banner)
                  const status = getEventStatus(event)
                  const statusBadge = getStatusBadgeProps(status)
                  const mapUrl = buildMapsSearchUrl(event)

                  return (
                    <CTableRow key={event.id}>
                      <CTableDataCell>
                        <div className="fw-semibold">{event.name}</div>
                        <div className="text-body-secondary small">{event.place ?? '—'}</div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex flex-column gap-1">
                          <span className="small text-body-secondary d-flex align-items-center gap-2">
                            <CIcon icon={cilCalendar} /> {formatDateRange(event.startDate, event.endDate)}
                          </span>
                          <CBadge color={statusBadge.color} shape="rounded-pill" className="align-self-start">
                            {statusBadge.text}
                          </CBadge>
                          {event.registrationEndDate && (
                            <span className="small text-body-secondary">
                              Registro hasta: {formatDateTime(event.registrationEndDate, { dateStyle: 'short', timeStyle: undefined })}
                            </span>
                          )}
                        </div>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-2 fw-semibold">
                          <CIcon icon={cilLocationPin} className="text-primary" />
                          <span>{event.colony?.name ?? '—'}</span>
                        </div>
                        <div className="text-body-secondary small">
                          {[
                            event.colony?.municipality?.name,
                            event.colony?.municipality?.state?.name,
                          ]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </div>
                        {event.address && (
                          <div className="text-body-secondary small">{event.address}</div>
                        )}
                        {mapUrl && (
                          <CButton
                            color="link"
                            size="sm"
                            className="px-0"
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <CIcon icon={cilMap} className="me-1" /> Ver en Maps
                          </CButton>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        {bannerUrl ? (
                          <div className="d-inline-flex flex-column gap-2 align-items-start">
                            <div className="ratio ratio-16x9 rounded overflow-hidden bg-body-secondary" style={{ width: '160px' }}>
                              <img
                                src={bannerUrl}
                                alt={`Banner de ${event.name}`}
                                className="w-100 h-100 object-fit-cover"
                              />
                            </div>
                            <CButton
                              color="link"
                              size="sm"
                              className="px-0"
                              href={bannerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <CIcon icon={cilExternalLink} className="me-1" /> Abrir
                            </CButton>
                          </div>
                        ) : (
                          <CBadge color="secondary" shape="rounded-pill">
                            Sin banner
                          </CBadge>
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <div className="d-flex flex-column align-items-end gap-2">
                          {isAdmin && (
                            <CButtonGroup role="group" aria-label="Acciones evento">
                              <CButton
                                color="secondary"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(event)}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteModal(event)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CButtonGroup>
                          )}
                          <CButton
                            size="sm"
                            color="info"
                            variant="outline"
                            onClick={() => openAcademiesModal(event)}
                          >
                            <CIcon icon={cilPeople} className="me-1" /> Ver Academias
                          </CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
            {filteredEvents.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center" aria-label="Paginación de eventos">
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

      <EventFormModal
        mode={formModalState.mode}
        visible={formModalState.visible}
        submitting={formSubmitting}
        onClose={closeFormModal}
        onSubmit={submitForm}
        event={formModalState.event}
        isAdmin={isAdmin}
        submitError={formError}
      />

      <DeleteEventModal
        visible={deleteModalState.visible}
        event={deleteModalState.event}
        deleting={deleting}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />

      <EventAcademiesModal
        visible={academiesModalState.visible}
        event={academiesModalState.event}
        onClose={closeAcademiesModal}
        isAdmin={isAdmin}
      />
    </CCard>
  )
}

export default EventsManagement