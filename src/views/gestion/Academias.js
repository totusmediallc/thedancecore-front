import React, { useCallback, useEffect, useMemo, useState } from 'react'

import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilCheckCircle,
  cilExternalLink,
  cilGlobeAlt,
  cilList,
  cilMap,
  cilPeople,
  cilPencil,
  cilPlus,
  cilReload,
  cilTrash,
  cilWarning,
  cilLocationPin,
  cilUser,
  cilUserFollow,
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
  createAcademy,
  deleteAcademy,
  listAcademies,
  updateAcademy,
} from '../../services/academiesApi'
import {
  listDancers,
  createDancer,
  updateDancer,
  deleteDancer,
} from '../../services/dancersApi'
import {
  listCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
} from '../../services/coachesApi'
import { listColonies, listMunicipalities, listStates } from '../../services/locationsApi'

const DEFAULT_FILTERS = {
  search: '',
  stateId: '',
  municipalityId: '',
  colonyId: '',
  hasWebsite: '',
  page: 1,
  limit: 10,
}

const HAS_WEBSITE_OPTIONS = [
  { value: '', label: 'Sitio web: Todos' },
  { value: 'true', label: 'Con sitio web' },
  { value: 'false', label: 'Sin sitio web' },
]

const LIMIT_OPTIONS = [10, 20, 50]

// Filtros para competidores
const DANCER_DEFAULT_FILTERS = {
  search: '',
  page: 1,
  limit: 10,
}

const DANCER_LIMIT_OPTIONS = LIMIT_OPTIONS

// Filtros para coaches
const COACH_DEFAULT_FILTERS = {
  search: '',
  page: 1,
  limit: 10,
}

const COACH_LIMIT_OPTIONS = LIMIT_OPTIONS

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

const formatDate = (value) => {
  if (!value) {
    return '—'
  }

  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return '—'
    }

    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch (error) {
    console.error('Unable to format date', error)
    return '—'
  }
}

const AcademyFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  academy,
}) => {
  const isEditMode = mode === 'edit'

  const initialLocation = useMemo(() => {
    if (!isEditMode || !academy?.colony) {
      return {
        state: null,
        municipality: null,
        colony: null,
      }
    }

    const colony = academy.colony
    const municipality = colony.municipality ?? null
    const state = municipality?.state ?? null

    return {
      state,
      municipality,
      colony,
    }
  }, [academy, isEditMode])

  const baseState = useMemo(
    () =>
      isEditMode && academy
        ? {
            name: academy.name ?? '',
            contactPhoneNumber: academy.contactPhoneNumber ?? '',
            mail: academy.mail ?? '',
            web: academy.web ?? '',
            googlemaps: academy.googlemaps ?? '',
            logo: academy.logo ?? '',
            stateId: initialLocation.state?.id ? String(initialLocation.state.id) : '',
            municipalityId: initialLocation.municipality?.id
              ? String(initialLocation.municipality.id)
              : '',
            colonyId: initialLocation.colony?.id ? String(initialLocation.colony.id) : '',
          }
        : {
            name: '',
            contactPhoneNumber: '',
            mail: '',
            web: '',
            googlemaps: '',
            logo: '',
            stateId: '',
            municipalityId: '',
            colonyId: '',
          },
    [academy, initialLocation, isEditMode],
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

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
      setMunicipalitySearch('')
      setColonySearch('')
      setSelectedColonySnapshot(initialLocation.colony ?? null)
    }
  }, [baseState, initialLocation, visible])

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
      setMunicipalitiesError(null)
      setMunicipalitySearch('')
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
        const sorted = [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'))
        setMunicipalities(sorted)
      } catch (error) {
        if (isMounted) {
          console.error('Unable to load municipalities', error)
          setMunicipalitiesError(getErrorMessage(error, 'No se pudieron cargar los municipios'))
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

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.name.trim()) {
      validationErrors.name = 'El nombre es obligatorio'
    }

    if (!formState.contactPhoneNumber.trim()) {
      validationErrors.contactPhoneNumber = 'El teléfono de contacto es obligatorio'
    }

    if (!formState.mail.trim()) {
      validationErrors.mail = 'El correo electrónico es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.mail.trim())) {
      validationErrors.mail = 'El correo no tiene un formato válido'
    }

    if (formState.web.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(formState.web.trim())
      } catch (error) {
        validationErrors.web = 'Ingresa una URL válida (incluye https://)'
      }
    }

    if (!formState.stateId) {
      validationErrors.stateId = 'El estado es obligatorio'
    }

    if (!formState.municipalityId) {
      validationErrors.municipalityId = 'El municipio es obligatorio'
    }

    if (!formState.colonyId) {
      validationErrors.colonyId = 'La colonia es obligatoria'
    } else if (Number.isNaN(Number(formState.colonyId))) {
      validationErrors.colonyId = 'Selecciona una colonia válida'
    }

    if (!formState.googlemaps.trim()) {
      validationErrors.googlemaps = 'El enlace de Google Maps es obligatorio'
    }

    if (formState.logo.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(formState.logo.trim())
      } catch (error) {
        validationErrors.logo = 'El logo debe ser una URL válida'
      }
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [formState])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    const payload = {
      name: formState.name.trim(),
      contactPhoneNumber: formState.contactPhoneNumber.trim(),
      mail: formState.mail.trim(),
      colonyId: Number(formState.colonyId),
      googlemaps: formState.googlemaps.trim(),
    }

    if (formState.web.trim()) {
      payload.web = formState.web.trim()
    }

    if (formState.logo.trim()) {
      payload.logo = formState.logo.trim()
    }

    onSubmit(payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="xl" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>{isEditMode ? 'Editar academia' : 'Registrar nueva academia'}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody className="py-4">
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="academy-name">Nombre</CFormLabel>
              <CFormInput
                id="academy-name"
                value={formState.name}
                onChange={handleChange('name')}
                required
                invalid={Boolean(errors.name)}
                disabled={submitting}
                autoFocus
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="academy-phone">Teléfono de contacto</CFormLabel>
              <CFormInput
                id="academy-phone"
                value={formState.contactPhoneNumber}
                onChange={handleChange('contactPhoneNumber')}
                required
                invalid={Boolean(errors.contactPhoneNumber)}
                placeholder="Ej: +52 55 1234 5678"
                disabled={submitting}
              />
              {errors.contactPhoneNumber && (
                <div className="invalid-feedback d-block">{errors.contactPhoneNumber}</div>
              )}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="academy-mail">Correo electrónico</CFormLabel>
              <CFormInput
                id="academy-mail"
                type="email"
                value={formState.mail}
                onChange={handleChange('mail')}
                required
                invalid={Boolean(errors.mail)}
                disabled={submitting}
              />
              {errors.mail && <div className="invalid-feedback d-block">{errors.mail}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="academy-web">Sitio web</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilGlobeAlt} />
                </CInputGroupText>
                <CFormInput
                  id="academy-web"
                  value={formState.web}
                  onChange={handleChange('web')}
                  placeholder="https://..."
                  invalid={Boolean(errors.web)}
                  disabled={submitting}
                />
              </CInputGroup>
              {errors.web && <div className="invalid-feedback d-block">{errors.web}</div>}
            </CCol>
            <CCol xs={12}>
              <CRow className="g-3">
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="academy-state">Estado</CFormLabel>
                  <CFormSelect
                    id="academy-state"
                    value={formState.stateId}
                    onChange={handleStateChange}
                    invalid={Boolean(errors.stateId)}
                    disabled={submitting || statesLoading}
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
                  {errors.stateId && <div className="invalid-feedback d-block">{errors.stateId}</div>}
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="academy-municipality">Municipio</CFormLabel>
                  <CFormInput
                    id="academy-municipality-search"
                    type="search"
                    placeholder="Escribe para filtrar"
                    value={municipalitySearch}
                    onChange={(event) => setMunicipalitySearch(event.target.value)}
                    disabled={!formState.stateId || municipalitiesLoading || submitting}
                  />
                  <CFormSelect
                    id="academy-municipality"
                    className="mt-2"
                    value={formState.municipalityId}
                    onChange={handleMunicipalityChange}
                    invalid={Boolean(errors.municipalityId)}
                    disabled={!formState.stateId || municipalitiesLoading || submitting}
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
                  <CFormLabel htmlFor="academy-colony">Colonia</CFormLabel>
                  <CFormInput
                    id="academy-colony-search"
                    type="search"
                    placeholder="Buscar colonia"
                    value={colonySearch}
                    onChange={(event) => setColonySearch(event.target.value)}
                    disabled={!formState.municipalityId || coloniesLoading || submitting}
                  />
                  <CFormSelect
                    id="academy-colony"
                    className="mt-2"
                    value={formState.colonyId}
                    onChange={handleColonyChange}
                    invalid={Boolean(errors.colonyId)}
                    disabled={!formState.municipalityId || coloniesLoading || submitting}
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
                  {coloniesError && <div className="invalid-feedback d-block">{coloniesError}</div>}
                  {errors.colonyId && <div className="invalid-feedback d-block">{errors.colonyId}</div>}
                </CCol>
              </CRow>
            </CCol>
            <CCol xs={12}>
              <CFormLabel htmlFor="academy-googlemaps">Enlace de Google Maps</CFormLabel>
              <CFormTextarea
                id="academy-googlemaps"
                value={formState.googlemaps}
                onChange={handleChange('googlemaps')}
                rows={3}
                required
                invalid={Boolean(errors.googlemaps)}
                placeholder="https://maps.google.com/..."
                disabled={submitting}
              />
              {errors.googlemaps && (
                <div className="invalid-feedback d-block">{errors.googlemaps}</div>
              )}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="academy-logo">Logo (URL)</CFormLabel>
              <CFormInput
                id="academy-logo"
                value={formState.logo}
                onChange={handleChange('logo')}
                placeholder="https://cdn.../logo.png"
                invalid={Boolean(errors.logo)}
                disabled={submitting}
              />
              {errors.logo && <div className="invalid-feedback d-block">{errors.logo}</div>}
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting && <CSpinner size="sm" className="me-2" />}{' '}
            {isEditMode ? 'Guardar cambios' : 'Crear academia'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}


const DeleteConfirmationModal = ({ visible, academy, deleting, onClose, onConfirm }) => {
  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Eliminar academia</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-3">
          Estás a punto de eliminar la academia <strong>{academy?.name}</strong>. Esta acción es permanente y podría afectar
          a otros módulos asociados.
        </p>
        <CAlert color="warning" className="d-flex align-items-center" variant="solid">
          <CIcon icon={cilWarning} className="me-2" />
          Confirma solo si estás seguro de que no hay datos dependientes pendientes.
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
}

// Modal para crear / editar competidor
const DancerFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  dancer,
  academy,
  existingCurps,
  isAdmin,
}) => {
  const isEditMode = mode === 'edit'

  const baseState = useMemo(
    () =>
      isEditMode && dancer
        ? {
            name: dancer.name ?? '',
            email: dancer.email ?? '',
            phone: dancer.phone ?? '',
            birthDate: dancer.birthDate ? dancer.birthDate.substring(0, 10) : '',
            curp: dancer.curp ?? '',
          }
        : {
            name: '',
            email: '',
            phone: '',
            birthDate: '',
            curp: '',
          },
    [isEditMode, dancer],
  )

  const [formState, setFormState] = useState(baseState)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
    }
  }, [visible, baseState])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.name.trim()) {
      validationErrors.name = 'El nombre es obligatorio'
    }

    if (!formState.birthDate) {
      validationErrors.birthDate = 'La fecha de nacimiento es obligatoria'
    }

    if (!formState.curp.trim()) {
      validationErrors.curp = 'La CURP es obligatoria'
    } else {
      const normalizedCurp = formState.curp.trim().toLowerCase()
      // Validación básica de formato (alfa-numérico, longitud típica 18)
      if (!/^[a-zA-Z0-9]{10,18}$/.test(normalizedCurp)) {
        validationErrors.curp = 'CURP inválida (usa caracteres alfanuméricos)'
      } else {
        const duplicate = existingCurps.some(
          (c) => c === normalizedCurp && (!isEditMode || normalizedCurp !== dancer.curp?.toLowerCase()),
        )
        if (duplicate) {
          validationErrors.curp = 'Ya existe un competidor con esta CURP en la academia'
        }
      }
    }

    if (formState.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
        validationErrors.email = 'Correo inválido'
      }
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [formState, existingCurps, isEditMode, dancer])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }
    const payload = {
      name: formState.name.trim(),
      // Backend confirmado: usar solo birthDate
      birthDate: formState.birthDate, // YYYY-MM-DD
      curp: formState.curp.trim(),
      // Enviar siempre academyIds como strings para cumplir con el contrato del backend
      academyIds: [String(academy.id)],
    }
    if (formState.email.trim()) {
      payload.email = formState.email.trim()
    }
    if (formState.phone.trim()) {
      payload.phone = formState.phone.trim()
    }
    onSubmit(payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>
          {isEditMode ? 'Editar competidor' : 'Registrar nuevo competidor'} · {academy?.name}
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody className="py-4">
          {!isAdmin && (
            <CAlert color="info" className="mb-3">
              Solo administradores pueden crear o editar competidores.
            </CAlert>
          )}
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="dancer-name">Nombre</CFormLabel>
              <CFormInput
                id="dancer-name"
                value={formState.name}
                onChange={handleChange('name')}
                required
                invalid={Boolean(errors.name)}
                disabled={submitting || !isAdmin}
                autoFocus
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="dancer-curp">CURP</CFormLabel>
              <CFormInput
                id="dancer-curp"
                value={formState.curp}
                onChange={handleChange('curp')}
                required
                invalid={Boolean(errors.curp)}
                disabled={submitting || !isAdmin}
                placeholder="Identificador único"
              />
              {errors.curp && <div className="invalid-feedback d-block">{errors.curp}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="dancer-birth">Fecha de nacimiento</CFormLabel>
              <CFormInput
                id="dancer-birth"
                type="date"
                value={formState.birthDate}
                onChange={handleChange('birthDate')}
                required
                invalid={Boolean(errors.birthDate)}
                disabled={submitting || !isAdmin}
              />
              {errors.birthDate && <div className="invalid-feedback d-block">{errors.birthDate}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="dancer-email">Correo electrónico</CFormLabel>
              <CFormInput
                id="dancer-email"
                type="email"
                value={formState.email}
                onChange={handleChange('email')}
                invalid={Boolean(errors.email)}
                disabled={submitting || !isAdmin}
                placeholder="Opcional"
              />
              {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="dancer-phone">Teléfono</CFormLabel>
              <CFormInput
                id="dancer-phone"
                value={formState.phone}
                onChange={handleChange('phone')}
                invalid={Boolean(errors.phone)}
                disabled={submitting || !isAdmin}
                placeholder="Opcional"
              />
              {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
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
              {isEditMode ? 'Guardar cambios' : 'Crear competidor'}
            </CButton>
          )}
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const DancerDeleteModal = ({ visible, dancer, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar competidor</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar al competidor <strong>{dancer?.name}</strong>. Esta acción es permanente.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" /> Confirma solo si estás seguro.
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

const DancersModal = ({
  visible,
  academy,
  onClose,
  isAdmin,
}) => {
  const [dancers, setDancers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [filters, setFilters] = useState(DANCER_DEFAULT_FILTERS)

  const [formState, setFormState] = useState({ visible: false, mode: 'create', dancer: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState({ visible: false, dancer: null })
  const [deleting, setDeleting] = useState(false)

  const loadDancers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listDancers()
      setDancers(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load dancers', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron cargar los competidores'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (visible && academy?.id) {
      loadDancers()
      setFilters(DANCER_DEFAULT_FILTERS)
    }
  }, [visible, academy, loadDancers])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setFeedback(null), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const filteredDancers = useMemo(() => {
    // Si el modal no tiene academia asociada (cerrado o reset), no filtramos nada
    if (!academy?.id) {
      return []
    }
    const normalized = filters.search.trim().toLowerCase()
    return dancers.filter((d) => {
      const belongs = Array.isArray(d.academies) && d.academies.some((a) => a?.id && String(a.id) === String(academy.id))
      if (!belongs) {
        return false
      }
      if (!normalized) {
        return true
      }
      const haystack = [d.name, d.email, d.phone, d.curp]
        .filter(Boolean)
        .map((v) => v.toString().toLowerCase())
      return haystack.some((v) => v.includes(normalized))
    })
  }, [dancers, filters.search, academy])

  const totalPages = Math.max(1, Math.ceil(filteredDancers.length / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)
  const paginatedDancers = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredDancers.slice(start, end)
  }, [filteredDancers, currentPage, filters.limit])

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: Math.min(prev.page, totalPages) }))
  }, [totalPages])

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }
  const handleLimitChange = (event) => {
    const value = Number(event.target.value)
    setFilters((prev) => ({ ...prev, limit: value, page: 1 }))
  }
  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }))

  const openCreate = () => setFormState({ visible: true, mode: 'create', dancer: null })
  const openEdit = (dancer) => setFormState({ visible: true, mode: 'edit', dancer })
  const closeForm = () => {
    if (formSubmitting) return
    setFormState({ visible: false, mode: 'create', dancer: null })
  }
  const openDelete = (dancer) => setDeleteState({ visible: true, dancer })
  const closeDelete = () => {
    if (deleting) return
    setDeleteState({ visible: false, dancer: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      // Diagnóstico: log de payload enviado
      // eslint-disable-next-line no-console
      console.log('[dancer submit payload]', payload)
      if (formState.mode === 'edit' && formState.dancer) {
        await updateDancer(formState.dancer.id, payload)
        setFeedback({ type: 'success', message: 'Competidor actualizado correctamente' })
      } else {
        await createDancer(payload)
        setFeedback({ type: 'success', message: 'Competidor creado correctamente' })
      }
      setFormState({ visible: false, mode: 'create', dancer: null })
      await loadDancers()
    } catch (requestError) {
      console.error('Dancer submit failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar el competidor') })
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteState.dancer) return
    setDeleting(true)
    setFeedback(null)
    try {
      await deleteDancer(deleteState.dancer.id)
      setFeedback({ type: 'success', message: 'Competidor eliminado correctamente' })
      setDeleteState({ visible: false, dancer: null })
      await loadDancers()
    } catch (requestError) {
      console.error('Dancer delete failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar el competidor') })
    } finally {
      setDeleting(false)
    }
  }

  const existingCurps = useMemo(
    () =>
      filteredDancers.map((d) => d.curp?.toLowerCase()).filter(Boolean),
    [filteredDancers],
  )

  // Evitar mantener modal montado cuando no es visible para reducir cálculos y posibles estados inconsistentes
  if (!visible) {
    return null
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="xl" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>
          Competidores de: {academy?.name}
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="py-4">
        {feedback && (
          <CAlert color={feedback.type} className="mb-4" dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}
        {error && <CAlert color="danger" className="mb-4">{error}</CAlert>}
        <CRow className="g-3 mb-3">
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="dancers-search">Buscar</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilList} />
              </CInputGroupText>
              <CFormInput
                id="dancers-search"
                placeholder="Buscar por nombre, correo, teléfono o CURP"
                value={filters.search}
                onChange={handleSearchChange}
                disabled={loading}
              />
            </CInputGroup>
          </CCol>
          <CCol xs={12} md={3}>
            <CFormLabel htmlFor="dancers-limit">Elementos por página</CFormLabel>
            <CFormSelect
              id="dancers-limit"
              value={filters.limit}
              onChange={handleLimitChange}
              disabled={loading}
            >
              {DANCER_LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={3} className="d-flex align-items-end">
            {isAdmin && (
              <CButton color="primary" className="w-100" onClick={openCreate} disabled={loading}>
                <CIcon icon={cilPlus} className="me-2" /> Nuevo competidor
              </CButton>
            )}
          </CCol>
        </CRow>
        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <React.Fragment>
            <CTable responsive="md" hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col">Nombre</CTableHeaderCell>
                  <CTableHeaderCell scope="col">CURP</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Contacto</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Nacimiento</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Actualización</CTableHeaderCell>
                  {isAdmin && <CTableHeaderCell scope="col" className="text-end">Acciones</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedDancers.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={isAdmin ? 6 : 5} className="text-center py-4 text-body-secondary">
                      No se encontraron competidores.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedDancers.map((dancer) => (
                  <CTableRow key={dancer.id}>
                    <CTableDataCell>
                      <div className="fw-semibold d-flex align-items-center gap-2">
                        <CIcon icon={cilUser} className="text-primary" /> {dancer.name}
                      </div>
                      <div className="text-body-secondary small">{dancer.email ?? 'Sin correo'}</div>
                    </CTableDataCell>
                    <CTableDataCell>{dancer.curp}</CTableDataCell>
                    <CTableDataCell>
                      <div>{dancer.phone ?? '—'}</div>
                      {dancer.email && (
                        <div className="text-body-secondary small">{dancer.email}</div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {dancer.birthDate ? new Date(dancer.birthDate).toLocaleDateString('es-MX') : '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-column gap-1">
                        <span className="small text-body-secondary d-flex align-items-center gap-2">
                          <CIcon icon={cilCalendar} /> Creado: {formatDate(dancer.createdAt)}
                        </span>
                        <span className="small text-body-secondary d-flex align-items-center gap-2">
                          <CIcon icon={cilCheckCircle} /> Actualizado: {formatDate(dancer.updatedAt)}
                        </span>
                      </div>
                    </CTableDataCell>
                    {isAdmin && (
                      <CTableDataCell className="text-end">
                        <CButtonGroup role="group" aria-label="Acciones competidor">
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(dancer)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDelete(dancer)}
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
            {filteredDancers.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center" aria-label="Paginación de competidores">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  >
                    Anterior
                  </CPaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <CPaginationItem
                      key={p}
                      active={p === currentPage}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
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
      </CModalBody>
      <CModalFooter className="bg-body-tertiary justify-content-between">
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading || formSubmitting || deleting}>
          Cerrar
        </CButton>
      </CModalFooter>

      <DancerFormModal
        mode={formState.mode}
        visible={formState.visible}
        submitting={formSubmitting}
        onClose={closeForm}
        onSubmit={submitForm}
        dancer={formState.dancer}
        academy={academy}
        existingCurps={existingCurps}
        isAdmin={isAdmin}
      />
      <DancerDeleteModal
        visible={deleteState.visible}
        dancer={deleteState.dancer}
        deleting={deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </CModal>
  )
}

// Modal para crear / editar coach
const CoachFormModal = ({
  mode,
  visible,
  submitting,
  onClose,
  onSubmit,
  coach,
  academy,
  isAdmin,
}) => {
  const isEditMode = mode === 'edit'

  const baseState = useMemo(
    () =>
      isEditMode && coach
        ? {
            name: coach.name ?? '',
            phone: coach.phone ?? '',
            mail: coach.mail ?? '',
          }
        : {
            name: '',
            phone: '',
            mail: '',
          },
    [isEditMode, coach],
  )

  const [formState, setFormState] = useState(baseState)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (visible) {
      setFormState(baseState)
      setErrors({})
    }
  }, [visible, baseState])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const validate = useCallback(() => {
    const validationErrors = {}

    if (!formState.name.trim()) {
      validationErrors.name = 'El nombre es obligatorio'
    }

    if (!formState.phone.trim()) {
      validationErrors.phone = 'El teléfono es obligatorio'
    }

    if (formState.mail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.mail.trim())) {
      validationErrors.mail = 'Correo inválido'
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [formState])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    const payload = {
      name: formState.name.trim(),
      phone: formState.phone.trim(),
      academyId: String(academy.id),
    }

    if (formState.mail.trim()) {
      payload.mail = formState.mail.trim()
    }

    onSubmit(payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>{isEditMode ? 'Editar coach' : 'Registrar nuevo coach'} · {academy?.name}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody className="py-4">
          {!isAdmin && (
            <CAlert color="info" className="mb-3">
              Solo administradores pueden crear o editar coaches.
            </CAlert>
          )}
          <CRow className="g-3">
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="coach-name">Nombre</CFormLabel>
              <CFormInput
                id="coach-name"
                value={formState.name}
                onChange={handleChange('name')}
                required
                invalid={Boolean(errors.name)}
                disabled={submitting || !isAdmin}
                autoFocus
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </CCol>
            <CCol xs={12} md={6}>
              <CFormLabel htmlFor="coach-phone">Teléfono</CFormLabel>
              <CFormInput
                id="coach-phone"
                value={formState.phone}
                onChange={handleChange('phone')}
                required
                invalid={Boolean(errors.phone)}
                disabled={submitting || !isAdmin}
                placeholder="Ej: +52 55 1234 5678"
              />
              {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
            </CCol>
            <CCol xs={12}>
              <CFormLabel htmlFor="coach-mail">Correo electrónico</CFormLabel>
              <CFormInput
                id="coach-mail"
                type="email"
                value={formState.mail}
                onChange={handleChange('mail')}
                invalid={Boolean(errors.mail)}
                disabled={submitting || !isAdmin}
                placeholder="Opcional"
              />
              {errors.mail && <div className="invalid-feedback d-block">{errors.mail}</div>}
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
              {isEditMode ? 'Guardar cambios' : 'Crear coach'}
            </CButton>
          )}
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const CoachDeleteModal = ({ visible, coach, deleting, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
    <CModalHeader closeButton>
      <CModalTitle>Eliminar coach</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <p className="mb-3">
        Estás a punto de eliminar al coach <strong>{coach?.name}</strong>. Esta acción es permanente.
      </p>
      <CAlert color="warning" className="d-flex align-items-center" variant="solid">
        <CIcon icon={cilWarning} className="me-2" /> Confirma solo si estás seguro.
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

const CoachesModal = ({ visible, academy, onClose, isAdmin }) => {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [filters, setFilters] = useState(COACH_DEFAULT_FILTERS)

  const [formState, setFormState] = useState({ visible: false, mode: 'create', coach: null })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteState, setDeleteState] = useState({ visible: false, coach: null })
  const [deleting, setDeleting] = useState(false)

  const loadCoaches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listCoaches()
      setCoaches(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load coaches', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron cargar los coaches'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (visible && academy?.id) {
      loadCoaches()
      setFilters(COACH_DEFAULT_FILTERS)
    }
  }, [visible, academy, loadCoaches])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setFeedback(null), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const filteredCoaches = useMemo(() => {
    if (!academy?.id) {
      return []
    }
    const normalized = filters.search.trim().toLowerCase()
    return coaches.filter((coach) => {
      const academyMatch = String(coach.academyId ?? coach.academy?.id ?? '') === String(academy.id)
      if (!academyMatch) {
        return false
      }
      if (!normalized) {
        return true
      }
      const haystack = [coach.name, coach.phone, coach.mail]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase())
      return haystack.some((value) => value.includes(normalized))
    })
  }, [coaches, filters.search, academy])

  const totalPages = Math.max(1, Math.ceil(filteredCoaches.length / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)
  const paginatedCoaches = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredCoaches.slice(start, end)
  }, [filteredCoaches, currentPage, filters.limit])

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: Math.min(prev.page, totalPages) }))
  }, [totalPages])

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }
  const handleLimitChange = (event) => {
    const value = Number(event.target.value)
    setFilters((prev) => ({ ...prev, limit: value, page: 1 }))
  }
  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }))

  const openCreate = () => setFormState({ visible: true, mode: 'create', coach: null })
  const openEdit = (coach) => setFormState({ visible: true, mode: 'edit', coach })
  const closeForm = () => {
    if (formSubmitting) return
    setFormState({ visible: false, mode: 'create', coach: null })
  }
  const openDelete = (coach) => setDeleteState({ visible: true, coach })
  const closeDelete = () => {
    if (deleting) return
    setDeleteState({ visible: false, coach: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      if (formState.mode === 'edit' && formState.coach) {
        await updateCoach(formState.coach.id, payload)
        setFeedback({ type: 'success', message: 'Coach actualizado correctamente' })
      } else {
        await createCoach(payload)
        setFeedback({ type: 'success', message: 'Coach creado correctamente' })
      }
      setFormState({ visible: false, mode: 'create', coach: null })
      await loadCoaches()
    } catch (requestError) {
      console.error('Coach submit failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar el coach') })
    } finally {
      setFormSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteState.coach) return
    setDeleting(true)
    setFeedback(null)
    try {
      await deleteCoach(deleteState.coach.id)
      setFeedback({ type: 'success', message: 'Coach eliminado correctamente' })
      setDeleteState({ visible: false, coach: null })
      await loadCoaches()
    } catch (requestError) {
      console.error('Coach delete failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar el coach') })
    } finally {
      setDeleting(false)
    }
  }

  if (!visible) {
    return null
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="xl" backdrop="static">
      <CModalHeader closeButton>
        <CModalTitle>Coaches de: {academy?.name}</CModalTitle>
      </CModalHeader>
      <CModalBody className="py-4">
        {feedback && (
          <CAlert color={feedback.type} className="mb-4" dismissible onClose={() => setFeedback(null)}>
            {feedback.message}
          </CAlert>
        )}
        {error && <CAlert color="danger" className="mb-4">{error}</CAlert>}
        <CRow className="g-3 mb-3">
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="coaches-search">Buscar</CFormLabel>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilList} />
              </CInputGroupText>
              <CFormInput
                id="coaches-search"
                placeholder="Buscar por nombre, teléfono o correo"
                value={filters.search}
                onChange={handleSearchChange}
                disabled={loading}
              />
            </CInputGroup>
          </CCol>
          <CCol xs={12} md={3}>
            <CFormLabel htmlFor="coaches-limit">Elementos por página</CFormLabel>
            <CFormSelect
              id="coaches-limit"
              value={filters.limit}
              onChange={handleLimitChange}
              disabled={loading}
            >
              {COACH_LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} md={3} className="d-flex align-items-end">
            {isAdmin && (
              <CButton color="primary" className="w-100" onClick={openCreate} disabled={loading}>
                <CIcon icon={cilPlus} className="me-2" /> Nuevo coach
              </CButton>
            )}
          </CCol>
        </CRow>
        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <React.Fragment>
            <CTable responsive="md" hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col">Nombre</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Teléfono</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Correo</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Actualización</CTableHeaderCell>
                  {isAdmin && <CTableHeaderCell scope="col" className="text-end">Acciones</CTableHeaderCell>}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedCoaches.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={isAdmin ? 5 : 4} className="text-center py-4 text-body-secondary">
                      No se encontraron coaches.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedCoaches.map((coach) => (
                  <CTableRow key={coach.id}>
                    <CTableDataCell>
                      <div className="fw-semibold d-flex align-items-center gap-2">
                        <CIcon icon={cilUserFollow} className="text-primary" /> {coach.name}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>{coach.phone ?? '—'}</CTableDataCell>
                    <CTableDataCell>{coach.mail ?? 'Sin correo'}</CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-column gap-1">
                        <span className="small text-body-secondary d-flex align-items-center gap-2">
                          <CIcon icon={cilCalendar} /> Creado: {formatDate(coach.createdAt)}
                        </span>
                        <span className="small text-body-secondary d-flex align-items-center gap-2">
                          <CIcon icon={cilCheckCircle} /> Actualizado: {formatDate(coach.updatedAt)}
                        </span>
                      </div>
                    </CTableDataCell>
                    {isAdmin && (
                      <CTableDataCell className="text-end">
                        <CButtonGroup role="group" aria-label="Acciones coach">
                          <CButton color="secondary" variant="ghost" size="sm" onClick={() => openEdit(coach)}>
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton color="danger" variant="ghost" size="sm" onClick={() => openDelete(coach)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CButtonGroup>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
            {filteredCoaches.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center" aria-label="Paginación de coaches">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  >
                    Anterior
                  </CPaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
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
      </CModalBody>
      <CModalFooter className="bg-body-tertiary justify-content-between">
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={loading || formSubmitting || deleting}>
          Cerrar
        </CButton>
      </CModalFooter>

      <CoachFormModal
        mode={formState.mode}
        visible={formState.visible}
        submitting={formSubmitting}
        onClose={closeForm}
        onSubmit={submitForm}
        coach={formState.coach}
        academy={academy}
        isAdmin={isAdmin}
      />
      <CoachDeleteModal
        visible={deleteState.visible}
        coach={deleteState.coach}
        deleting={deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </CModal>
  )
}

const AcademiesManagement = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [academies, setAcademies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [feedback, setFeedback] = useState(null)

  const [formModalState, setFormModalState] = useState({
    visible: false,
    mode: 'create',
    academy: null,
  })
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [deleteModalState, setDeleteModalState] = useState({
    visible: false,
    academy: null,
  })
  const [deleting, setDeleting] = useState(false)
  const [dancersModalState, setDancersModalState] = useState({ visible: false, academy: null })
  const [coachesModalState, setCoachesModalState] = useState({ visible: false, academy: null })

  const loadAcademies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listAcademies()
      setAcademies(Array.isArray(response) ? response : [])
    } catch (requestError) {
      console.error('Unable to load academies', requestError)
      setError(getErrorMessage(requestError, 'No se pudieron obtener las academias'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAcademies()
  }, [loadAcademies])

  useEffect(() => {
    if (!feedback) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const stateFilterOptions = useMemo(() => {
    const map = new Map()
    academies.forEach((academy) => {
      const state = academy.colony?.municipality?.state
      if (!state?.id) {
        return
      }

      const key = String(state.id)
      if (!map.has(key)) {
        map.set(key, state.name ?? `Estado ${state.id}`)
      }
    })

    const options = Array.from(map.entries())
      .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB, 'es'))
      .map(([value, label]) => ({ value, label }))

    return [{ value: '', label: 'Todos los estados' }, ...options]
  }, [academies])

  const municipalityFilterOptions = useMemo(() => {
    const map = new Map()
    academies.forEach((academy) => {
      const municipality = academy.colony?.municipality
      const state = municipality?.state
      if (!municipality?.id || !state?.id) {
        return
      }

      const stateId = String(state.id)
      if (filters.stateId && stateId !== filters.stateId) {
        return
      }

      const key = String(municipality.id)
      if (!map.has(key)) {
        map.set(key, {
          label: municipality.name ?? `Municipio ${municipality.id}`,
          stateName: state.name ?? `Estado ${state.id}`,
        })
      }
    })

    const options = Array.from(map.entries())
      .sort(([, a], [, b]) => a.label.localeCompare(b.label, 'es'))
      .map(([value, data]) => ({
        value,
        label: filters.stateId ? data.label : `${data.label} (${data.stateName})`,
      }))

    return [
      {
        value: '',
        label: filters.stateId ? 'Todos los municipios' : 'Todos los municipios',
      },
      ...options,
    ]
  }, [academies, filters.stateId])

  const colonyFilterOptions = useMemo(() => {
    const map = new Map()
    academies.forEach((academy) => {
      const colony = academy.colony
      const municipality = colony?.municipality
      const state = municipality?.state
      if (!colony?.id || !municipality?.id || !state?.id) {
        return
      }

      const stateId = String(state.id)
      const municipalityId = String(municipality.id)

      if (filters.stateId && stateId !== filters.stateId) {
        return
      }

      if (filters.municipalityId && municipalityId !== filters.municipalityId) {
        return
      }

      const key = String(colony.id)
      if (!map.has(key)) {
        map.set(key, {
          label: colony.name ?? `Colonia ${colony.id}`,
          municipalityName: municipality.name ?? `Municipio ${municipality.id}`,
        })
      }
    })

    const options = Array.from(map.entries())
      .sort(([, a], [, b]) => a.label.localeCompare(b.label, 'es'))
      .map(([value, data]) => ({
        value,
        label:
          filters.municipalityId || filters.stateId
            ? data.label
            : `${data.label} (${data.municipalityName})`,
      }))

    return [{ value: '', label: 'Todas las colonias' }, ...options]
  }, [academies, filters.municipalityId, filters.stateId])

  const filteredAcademies = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()

    return academies.filter((academy) => {
      const colony = academy.colony ?? null
      const municipality = colony?.municipality ?? null
      const state = municipality?.state ?? null
      const country = state?.country ?? null

      if (normalizedSearch) {
        const haystack = [
          academy.name,
          academy.mail,
          academy.contactPhoneNumber,
          colony?.name,
          colony?.city,
          colony?.settlement,
          colony?.postalCode ? colony.postalCode.toString() : null,
          municipality?.name,
          state?.name,
          country?.name,
        ]
          .filter(Boolean)
          .map((value) => value.toString().toLowerCase())

        if (!haystack.some((value) => value.includes(normalizedSearch))) {
          return false
        }
      }

      if (filters.stateId && String(state?.id ?? '') !== filters.stateId) {
        return false
      }

      if (filters.municipalityId && String(municipality?.id ?? '') !== filters.municipalityId) {
        return false
      }

      if (filters.colonyId && String(colony?.id ?? '') !== filters.colonyId) {
        return false
      }

      if (filters.hasWebsite === 'true' && !academy.web) {
        return false
      }

      if (filters.hasWebsite === 'false' && academy.web) {
        return false
      }

      return true
    })
  }, [academies, filters.colonyId, filters.hasWebsite, filters.municipalityId, filters.search, filters.stateId])

  const totalPages = Math.max(1, Math.ceil(filteredAcademies.length / filters.limit))
  const currentPage = Math.min(filters.page, totalPages)
  const paginatedAcademies = useMemo(() => {
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    return filteredAcademies.slice(start, end)
  }, [currentPage, filteredAcademies, filters.limit])

  useEffect(() => {
    setFilters((prev) => {
      const safePage = Math.min(prev.page, totalPages)
      if (safePage === prev.page) {
        return prev
      }
      return { ...prev, page: safePage }
    })
  }, [totalPages])

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value
    setFilters((prev) => {
      const next = {
        ...prev,
        [field]: field === 'limit' ? Number(value) : value,
        page: 1,
      }

      if (field === 'stateId') {
        next.municipalityId = ''
        next.colonyId = ''
      }

      if (field === 'municipalityId') {
        next.colonyId = ''
      }

      return next
    })
  }

  const handleSearchChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const openCreateModal = () => {
    setFormModalState({ visible: true, mode: 'create', academy: null })
  }

  const openEditModal = (academy) => {
    setFormModalState({ visible: true, mode: 'edit', academy })
  }

  const closeFormModal = () => {
    if (formSubmitting) {
      return
    }
    setFormModalState({ visible: false, mode: 'create', academy: null })
  }

  const submitForm = async (payload) => {
    setFormSubmitting(true)
    setFeedback(null)
    try {
      if (formModalState.mode === 'edit' && formModalState.academy) {
        await updateAcademy(formModalState.academy.id, payload)
        setFeedback({ type: 'success', message: 'Academia actualizada correctamente' })
      } else {
        await createAcademy(payload)
        setFeedback({ type: 'success', message: 'Academia creada correctamente' })
      }
      setFormModalState({ visible: false, mode: 'create', academy: null })
      await loadAcademies()
    } catch (requestError) {
      console.error('Academy submit failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo guardar la academia') })
    } finally {
      setFormSubmitting(false)
    }
  }

  const openDeleteModal = (academy) => {
    setDeleteModalState({ visible: true, academy })
  }

  const closeDeleteModal = () => {
    if (deleting) {
      return
    }
    setDeleteModalState({ visible: false, academy: null })
  }

  const confirmDelete = async () => {
    if (!deleteModalState.academy) {
      return
    }

    setDeleting(true)
    setFeedback(null)
    try {
      await deleteAcademy(deleteModalState.academy.id)
      setFeedback({ type: 'success', message: 'Academia eliminada correctamente' })
      setDeleteModalState({ visible: false, academy: null })
      await loadAcademies()
    } catch (requestError) {
      console.error('Academy delete failed', requestError)
      setFeedback({ type: 'danger', message: getErrorMessage(requestError, 'No se pudo eliminar la academia') })
    } finally {
      setDeleting(false)
    }
  }

  const openDancersModal = (academy) => {
    setDancersModalState({ visible: true, academy })
  }

  const closeDancersModal = () => {
    setDancersModalState({ visible: false, academy: null })
  }

  const openCoachesModal = (academy) => {
    setCoachesModalState({ visible: true, academy })
  }

  const closeCoachesModal = () => {
    setCoachesModalState({ visible: false, academy: null })
  }

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-md-row align-items-md-center gap-2 justify-content-between">
        <div>
          <h5 className="mb-0">Academias</h5>
          <small className="text-body-secondary">Gestiona el alta, edición y baja de academias</small>
        </div>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="ghost" onClick={loadAcademies} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
          </CButton>
          {isAdmin && (
            <CButton color="primary" onClick={openCreateModal}>
              <CIcon icon={cilPlus} className="me-2" /> Nueva academia
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
            Puedes consultar el detalle de las academias, pero solo el equipo administrador puede crear, editar o eliminar
            registros.
          </CAlert>
        )}

        <CForm className="mb-4">
          <CRow className="g-3">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="academy-search">Buscar</CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilList} />
                </CInputGroupText>
                <CFormInput
                  id="academy-search"
                  placeholder="Buscar por nombre, correo, teléfono o ubicación"
                  value={filters.search}
                  onChange={handleSearchChange}
                />
              </CInputGroup>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="academy-state-filter">Estado</CFormLabel>
              <CFormSelect
                id="academy-state-filter"
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
              <CFormLabel htmlFor="academy-municipality-filter">Municipio</CFormLabel>
              <CFormSelect
                id="academy-municipality-filter"
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
          <CRow className="g-3 mt-1 align-items-end">
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="academy-colony-filter">Colonia</CFormLabel>
              <CFormSelect
                id="academy-colony-filter"
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
              <CFormLabel htmlFor="academy-website-filter">Sitio web</CFormLabel>
              <CFormSelect
                id="academy-website-filter"
                value={filters.hasWebsite}
                onChange={handleFilterChange('hasWebsite')}
              >
                {HAS_WEBSITE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="academy-limit">Elementos por página</CFormLabel>
              <CFormSelect
                id="academy-limit"
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

        {error && <CAlert color="danger" className="mb-4">{error}</CAlert>}

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <React.Fragment>
            <CTable responsive="md" hover align="middle" className="mb-4">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell scope="col" className="text-center">Academia</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">Contacto</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">Ubicación</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">Sitio web</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">Actualización</CTableHeaderCell>
                  <CTableHeaderCell scope="col" className="text-center">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {paginatedAcademies.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-center py-4 text-body-secondary">
                      No se encontraron academias con los filtros seleccionados.
                    </CTableDataCell>
                  </CTableRow>
                )}
                {paginatedAcademies.map((academy) => (
                  <CTableRow key={academy.id}>
                    <CTableDataCell>
                      <div className="fw-semibold">{academy.name}</div>
                      <div className="text-body-secondary small">{academy.mail}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div>{academy.contactPhoneNumber ?? '—'}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex align-items-center gap-2 fw-semibold">
                        <CIcon icon={cilLocationPin} className="text-primary" />
                        <span>{academy.colony?.name ?? '—'}</span>
                      </div>
                      <div className="text-body-secondary small">
                        {[
                          academy.colony?.municipality?.name,
                          academy.colony?.municipality?.state?.name,
                        ]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </div>
                      {academy.colony?.postalCode && (
                        <div className="text-body-secondary small">CP {academy.colony.postalCode}</div>
                      )}
                      {academy.googlemaps && (
                        <CButton
                          color="link"
                          size="sm"
                          href={academy.googlemaps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-0"
                        >
                          <CIcon icon={cilMap} className="me-1" /> Ver en Maps
                        </CButton>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      {academy.web ? (
                        <CButton
                          color="link"
                          size="sm"
                          href={academy.web}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-0"
                        >
                          <CIcon icon={cilExternalLink} className="me-1" /> Visitar sitio
                        </CButton>
                      ) : (
                        <CBadge color="secondary" shape="rounded-pill">
                          Sin sitio web
                        </CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex flex-column gap-1">
                        <span className="small d-flex align-items-center gap-2 text-body-secondary">
                          <CIcon icon={cilCalendar} /> Creado: {formatDate(academy.createdAt)}
                        </span>
                        <span className="small d-flex align-items-center gap-2 text-body-secondary">
                          <CIcon icon={cilCheckCircle} /> Actualizado: {formatDate(academy.updatedAt)}
                        </span>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <div className="d-flex flex-column align-items-end gap-2">
                        {isAdmin && (
                          <CButtonGroup role="group" aria-label="Acciones administrativas">
                            <CButton
                              color="secondary"
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(academy)}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(academy)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CButtonGroup>
                        )}
                        <div className="d-flex flex-wrap justify-content-end gap-2">
                          <CButton
                            size="sm"
                            color="primary"
                            variant="outline"
                            onClick={() => openDancersModal(academy)}
                          >
                            <CIcon icon={cilPeople} className="me-1" /> Ver competidores
                          </CButton>
                          <CButton
                            size="sm"
                            color="info"
                            variant="outline"
                            onClick={() => openCoachesModal(academy)}
                          >
                            <CIcon icon={cilUser} className="me-1" /> Ver coaches
                          </CButton>
                        </div>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {filteredAcademies.length > filters.limit && (
              <div className="d-flex justify-content-center">
                <CPagination align="center" aria-label="Paginación de academias">
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

      <AcademyFormModal
        mode={formModalState.mode}
        visible={formModalState.visible}
        submitting={formSubmitting}
        onClose={closeFormModal}
        onSubmit={submitForm}
        academy={formModalState.academy}
      />

      <DeleteConfirmationModal
        visible={deleteModalState.visible}
        academy={deleteModalState.academy}
        deleting={deleting}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
      {dancersModalState.visible && (
        <DancersModal
          visible={dancersModalState.visible}
          academy={dancersModalState.academy}
          onClose={closeDancersModal}
          isAdmin={isAdmin}
        />
      )}
      {coachesModalState.visible && (
        <CoachesModal
          visible={coachesModalState.visible}
          academy={coachesModalState.academy}
          onClose={closeCoachesModal}
          isAdmin={isAdmin}
        />
      )}
    </CCard>
  )
}

export default AcademiesManagement
