import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
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
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBuilding, cilUser, cilCheckCircle } from '@coreui/icons'

import { listStates, listMunicipalities, listColonies } from '../../services/locationsApi'

/**
 * Modal para crear academia con usuario administrador
 * Dividido en tabs: Datos de Academia y Datos de Usuario Admin
 */
const AcademyWithUserFormModal = ({
  visible,
  submitting,
  onClose,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState('academy')

  // Estado del formulario de academia
  const [academyState, setAcademyState] = useState({
    name: '',
    contactPhoneNumber: '',
    mail: '',
    web: '',
    googlemaps: '',
    logo: '',
    stateId: '',
    municipalityId: '',
    colonyId: '',
  })

  // Estado del formulario de usuario
  const [userState, setUserState] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  })

  const [errors, setErrors] = useState({})

  // Estados para ubicación
  const [states, setStates] = useState([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [statesError, setStatesError] = useState(null)

  const [municipalities, setMunicipalities] = useState([])
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false)
  const [municipalitiesError, setMunicipalitiesError] = useState(null)

  const [colonies, setColonies] = useState([])
  const [coloniesLoading, setColoniesLoading] = useState(false)
  const [coloniesError, setColoniesError] = useState(null)
  const [colonySearch, setColonySearch] = useState('')

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setActiveTab('academy')
      setAcademyState({
        name: '',
        contactPhoneNumber: '',
        mail: '',
        web: '',
        googlemaps: '',
        logo: '',
        stateId: '',
        municipalityId: '',
        colonyId: '',
      })
      setUserState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
      })
      setErrors({})
      setColonySearch('')
      loadStates()
    }
  }, [visible])

  // Cargar estados
  const loadStates = async () => {
    setStatesLoading(true)
    setStatesError(null)
    try {
      const response = await listStates()
      setStates(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Error loading states', error)
      setStatesError('No se pudieron cargar los estados')
    } finally {
      setStatesLoading(false)
    }
  }

  // Cargar municipios cuando cambie el estado
  useEffect(() => {
    if (!academyState.stateId) {
      setMunicipalities([])
      return
    }
    const loadMunicipalities = async () => {
      setMunicipalitiesLoading(true)
      setMunicipalitiesError(null)
      try {
        const response = await listMunicipalities(academyState.stateId)
        setMunicipalities(Array.isArray(response) ? response : [])
      } catch (error) {
        console.error('Error loading municipalities', error)
        setMunicipalitiesError('No se pudieron cargar los municipios')
      } finally {
        setMunicipalitiesLoading(false)
      }
    }
    loadMunicipalities()
  }, [academyState.stateId])

  // Cargar colonias cuando cambie el municipio
  useEffect(() => {
    if (!academyState.municipalityId) {
      setColonies([])
      return
    }
    const loadColonies = async () => {
      setColoniesLoading(true)
      setColoniesError(null)
      try {
        const response = await listColonies(academyState.municipalityId)
        setColonies(Array.isArray(response) ? response : [])
      } catch (error) {
        console.error('Error loading colonies', error)
        setColoniesError('No se pudieron cargar las colonias')
      } finally {
        setColoniesLoading(false)
      }
    }
    loadColonies()
  }, [academyState.municipalityId])

  // Filtrar colonias por búsqueda
  const filteredColonies = useMemo(() => {
    if (!colonySearch.trim()) return colonies
    const normalized = colonySearch.toLowerCase().trim()
    return colonies.filter((colony) =>
      colony.name?.toLowerCase().includes(normalized) ||
      colony.postalCode?.toString().includes(normalized)
    )
  }, [colonies, colonySearch])

  // Handlers de cambio
  const handleAcademyChange = (field) => (event) => {
    const value = event.target.value
    setAcademyState((prev) => ({ ...prev, [field]: value }))
  }

  const handleUserChange = (field) => (event) => {
    const value = event.target.value
    setUserState((prev) => ({ ...prev, [field]: value }))
  }

  const handleStateChange = (event) => {
    const value = event.target.value
    setAcademyState((prev) => ({
      ...prev,
      stateId: value,
      municipalityId: '',
      colonyId: '',
    }))
    setColonySearch('')
  }

  const handleMunicipalityChange = (event) => {
    const value = event.target.value
    setAcademyState((prev) => ({
      ...prev,
      municipalityId: value,
      colonyId: '',
    }))
    setColonySearch('')
  }

  const handleColonyChange = (event) => {
    const value = event.target.value
    setAcademyState((prev) => ({ ...prev, colonyId: value }))
  }

  // Validación
  const validate = useCallback(() => {
    const validationErrors = {}

    // Validar academia
    if (!academyState.name.trim()) {
      validationErrors.name = 'El nombre es obligatorio'
    }
    if (!academyState.contactPhoneNumber.trim()) {
      validationErrors.contactPhoneNumber = 'El teléfono es obligatorio'
    }
    if (!academyState.mail.trim()) {
      validationErrors.mail = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(academyState.mail.trim())) {
      validationErrors.mail = 'Correo inválido'
    }
    if (!academyState.colonyId) {
      validationErrors.colonyId = 'Debes seleccionar una colonia'
    }
    if (!academyState.googlemaps.trim()) {
      validationErrors.googlemaps = 'El enlace de Google Maps es obligatorio'
    }

    // Validar usuario
    if (!userState.email.trim()) {
      validationErrors.userEmail = 'El email del usuario es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userState.email.trim())) {
      validationErrors.userEmail = 'Email de usuario inválido'
    }
    if (!userState.password) {
      validationErrors.password = 'La contraseña es obligatoria'
    } else if (userState.password.length < 6) {
      validationErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }
    if (userState.password !== userState.confirmPassword) {
      validationErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    if (!userState.firstName.trim()) {
      validationErrors.firstName = 'El nombre del usuario es obligatorio'
    }

    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }, [academyState, userState])

  // Verificar si hay errores en cada tab
  const academyHasErrors = useMemo(() => {
    return ['name', 'contactPhoneNumber', 'mail', 'colonyId', 'googlemaps'].some(
      (field) => errors[field]
    )
  }, [errors])

  const userHasErrors = useMemo(() => {
    return ['userEmail', 'password', 'confirmPassword', 'firstName'].some(
      (field) => errors[field]
    )
  }, [errors])

  // Submit
  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validate()) {
      // Si hay errores, ir al tab que tenga errores
      if (academyHasErrors) {
        setActiveTab('academy')
      } else if (userHasErrors) {
        setActiveTab('user')
      }
      return
    }

    const payload = {
      // Datos de academia
      name: academyState.name.trim(),
      contactPhoneNumber: academyState.contactPhoneNumber.trim(),
      mail: academyState.mail.trim(),
      colonyId: Number(academyState.colonyId),
      googlemaps: academyState.googlemaps.trim(),
      // Datos de usuario
      adminUser: {
        email: userState.email.trim(),
        password: userState.password,
        firstName: userState.firstName.trim(),
      },
    }

    // Campos opcionales
    if (academyState.web.trim()) {
      payload.web = academyState.web.trim()
    }
    if (academyState.logo.trim()) {
      payload.logo = academyState.logo.trim()
    }
    if (userState.lastName.trim()) {
      payload.adminUser.lastName = userState.lastName.trim()
    }

    onSubmit(payload)
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg" backdrop="static" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>Crear academia con usuario administrador</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit} noValidate>
        <CModalBody className="py-4">
          {/* Tabs */}
          <CNav variant="tabs" className="mb-4">
            <CNavItem>
              <CNavLink
                active={activeTab === 'academy'}
                onClick={() => setActiveTab('academy')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilBuilding} className="me-2" />
                Datos de Academia
                {academyHasErrors && (
                  <span className="ms-2 text-danger">●</span>
                )}
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'user'}
                onClick={() => setActiveTab('user')}
                style={{ cursor: 'pointer' }}
              >
                <CIcon icon={cilUser} className="me-2" />
                Usuario Administrador
                {userHasErrors && (
                  <span className="ms-2 text-danger">●</span>
                )}
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent>
            {/* Tab: Datos de Academia */}
            <CTabPane visible={activeTab === 'academy'}>
              <CRow className="g-3">
                <CCol xs={12}>
                  <CFormLabel htmlFor="academy-name">Nombre de la Academia *</CFormLabel>
                  <CFormInput
                    id="academy-name"
                    value={academyState.name}
                    onChange={handleAcademyChange('name')}
                    required
                    invalid={Boolean(errors.name)}
                    disabled={submitting}
                    autoFocus
                  />
                  {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="academy-phone">Teléfono de contacto *</CFormLabel>
                  <CFormInput
                    id="academy-phone"
                    value={academyState.contactPhoneNumber}
                    onChange={handleAcademyChange('contactPhoneNumber')}
                    required
                    invalid={Boolean(errors.contactPhoneNumber)}
                    disabled={submitting}
                    placeholder="+52 55 1234 5678"
                  />
                  {errors.contactPhoneNumber && (
                    <div className="invalid-feedback d-block">{errors.contactPhoneNumber}</div>
                  )}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="academy-mail">Correo electrónico *</CFormLabel>
                  <CFormInput
                    id="academy-mail"
                    type="email"
                    value={academyState.mail}
                    onChange={handleAcademyChange('mail')}
                    required
                    invalid={Boolean(errors.mail)}
                    disabled={submitting}
                    placeholder="academia@ejemplo.com"
                  />
                  {errors.mail && <div className="invalid-feedback d-block">{errors.mail}</div>}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="academy-web">Sitio web</CFormLabel>
                  <CFormInput
                    id="academy-web"
                    value={academyState.web}
                    onChange={handleAcademyChange('web')}
                    disabled={submitting}
                    placeholder="https://www.academia.com"
                  />
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="academy-logo">Logo (URL)</CFormLabel>
                  <CFormInput
                    id="academy-logo"
                    value={academyState.logo}
                    onChange={handleAcademyChange('logo')}
                    disabled={submitting}
                    placeholder="https://cdn.../logo.png"
                  />
                </CCol>

                {/* Ubicación */}
                <CCol xs={12}>
                  <h6 className="mt-3 mb-3">Ubicación</h6>
                </CCol>

                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="academy-state">Estado *</CFormLabel>
                  <CFormSelect
                    id="academy-state"
                    value={academyState.stateId}
                    onChange={handleStateChange}
                    disabled={statesLoading || submitting}
                  >
                    <option value="">Selecciona un estado</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </CFormSelect>
                  {statesLoading && (
                    <div className="small text-body-secondary mt-1 d-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Cargando...
                    </div>
                  )}
                  {statesError && <div className="text-danger small mt-1">{statesError}</div>}
                </CCol>

                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="academy-municipality">Municipio *</CFormLabel>
                  <CFormSelect
                    id="academy-municipality"
                    value={academyState.municipalityId}
                    onChange={handleMunicipalityChange}
                    disabled={!academyState.stateId || municipalitiesLoading || submitting}
                  >
                    <option value="">Selecciona un municipio</option>
                    {municipalities.map((mun) => (
                      <option key={mun.id} value={mun.id}>
                        {mun.name}
                      </option>
                    ))}
                  </CFormSelect>
                  {municipalitiesLoading && (
                    <div className="small text-body-secondary mt-1 d-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Cargando...
                    </div>
                  )}
                  {municipalitiesError && <div className="text-danger small mt-1">{municipalitiesError}</div>}
                </CCol>

                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="academy-colony">Colonia *</CFormLabel>
                  <CFormInput
                    id="academy-colony-search"
                    type="search"
                    placeholder="Buscar colonia..."
                    value={colonySearch}
                    onChange={(e) => setColonySearch(e.target.value)}
                    disabled={!academyState.municipalityId || coloniesLoading || submitting}
                    className="mb-2"
                  />
                  <CFormSelect
                    id="academy-colony"
                    value={academyState.colonyId}
                    onChange={handleColonyChange}
                    invalid={Boolean(errors.colonyId)}
                    disabled={!academyState.municipalityId || coloniesLoading || submitting}
                  >
                    <option value="">Selecciona una colonia</option>
                    {filteredColonies.map((colony) => (
                      <option key={colony.id} value={colony.id}>
                        {colony.name} {colony.postalCode ? `(CP: ${colony.postalCode})` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                  {coloniesLoading && (
                    <div className="small text-body-secondary mt-1 d-flex align-items-center gap-2">
                      <CSpinner size="sm" /> Cargando...
                    </div>
                  )}
                  {coloniesError && <div className="text-danger small mt-1">{coloniesError}</div>}
                  {errors.colonyId && <div className="invalid-feedback d-block">{errors.colonyId}</div>}
                </CCol>

                <CCol xs={12}>
                  <CFormLabel htmlFor="academy-googlemaps">Enlace de Google Maps *</CFormLabel>
                  <CFormTextarea
                    id="academy-googlemaps"
                    value={academyState.googlemaps}
                    onChange={handleAcademyChange('googlemaps')}
                    rows={2}
                    required
                    invalid={Boolean(errors.googlemaps)}
                    disabled={submitting}
                    placeholder="https://maps.google.com/..."
                  />
                  {errors.googlemaps && (
                    <div className="invalid-feedback d-block">{errors.googlemaps}</div>
                  )}
                </CCol>
              </CRow>
            </CTabPane>

            {/* Tab: Usuario Administrador */}
            <CTabPane visible={activeTab === 'user'}>
              <CAlert color="info" className="mb-4">
                <CIcon icon={cilCheckCircle} className="me-2" />
                Este usuario será creado automáticamente con el rol <strong>academy</strong> y
                tendrá acceso para administrar la academia.
              </CAlert>

              <CRow className="g-3">
                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="user-email">Email *</CFormLabel>
                  <CFormInput
                    id="user-email"
                    type="email"
                    value={userState.email}
                    onChange={handleUserChange('email')}
                    required
                    invalid={Boolean(errors.userEmail)}
                    disabled={submitting}
                    placeholder="usuario@academia.com"
                  />
                  {errors.userEmail && <div className="invalid-feedback d-block">{errors.userEmail}</div>}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="user-firstName">Nombre *</CFormLabel>
                  <CFormInput
                    id="user-firstName"
                    value={userState.firstName}
                    onChange={handleUserChange('firstName')}
                    required
                    invalid={Boolean(errors.firstName)}
                    disabled={submitting}
                  />
                  {errors.firstName && <div className="invalid-feedback d-block">{errors.firstName}</div>}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="user-lastName">Apellido</CFormLabel>
                  <CFormInput
                    id="user-lastName"
                    value={userState.lastName}
                    onChange={handleUserChange('lastName')}
                    disabled={submitting}
                    placeholder="Opcional"
                  />
                </CCol>

                <CCol xs={12} md={6}>
                  {/* Espacio vacío para alinear */}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="user-password">Contraseña *</CFormLabel>
                  <CFormInput
                    id="user-password"
                    type="password"
                    value={userState.password}
                    onChange={handleUserChange('password')}
                    required
                    invalid={Boolean(errors.password)}
                    disabled={submitting}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                </CCol>

                <CCol xs={12} md={6}>
                  <CFormLabel htmlFor="user-confirmPassword">Confirmar contraseña *</CFormLabel>
                  <CFormInput
                    id="user-confirmPassword"
                    type="password"
                    value={userState.confirmPassword}
                    onChange={handleUserChange('confirmPassword')}
                    required
                    invalid={Boolean(errors.confirmPassword)}
                    disabled={submitting}
                    placeholder="Repite la contraseña"
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback d-block">{errors.confirmPassword}</div>
                  )}
                </CCol>
              </CRow>
            </CTabPane>
          </CTabContent>
        </CModalBody>

        <CModalFooter className="bg-body-tertiary justify-content-between">
          <CButton color="secondary" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </CButton>
          <div className="d-flex gap-2">
            {activeTab === 'user' && (
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => setActiveTab('academy')}
                disabled={submitting}
              >
                ← Anterior
              </CButton>
            )}
            {activeTab === 'academy' && (
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => setActiveTab('user')}
                disabled={submitting}
              >
                Siguiente →
              </CButton>
            )}
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting && <CSpinner size="sm" className="me-2" />}
              Crear academia y usuario
            </CButton>
          </div>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

AcademyWithUserFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  submitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

export default AcademyWithUserFormModal
