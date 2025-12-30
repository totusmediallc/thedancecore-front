import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

import { useAuth } from '../../../hooks/useAuth'
import { HttpError } from '../../../services/httpClient'
import tdcLogo from 'src/assets/images/tdc01.png'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, isLoading, location.state, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email: email.trim(), password })
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      if (submitError instanceof HttpError) {
        const message =
          submitError.data?.message ??
          'Credenciales inválidas. Verifica tus datos e inténtalo nuevamente.'
        setError(message)
      } else {
        setError('No fue posible iniciar sesión. Inténtalo nuevamente en unos minutos.')
        console.error('Unexpected login error', submitError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const infoCardBackground = '#007ae7' // Change this hex to update the logo panel color

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={10} lg={9} xl={8}>
            <CCardGroup className="w-100">
              <CCard
                className="text-white py-5 border-0"
                style={{
                  flex: '0 0 55%',
                  maxWidth: '55%',
                  backgroundColor: infoCardBackground,
                }}
              >
                <CCardBody className="d-flex justify-content-center align-items-center">
                  <img src={tdcLogo} alt="The Dance Core" style={{ maxHeight: '120px' }} />
                </CCardBody>
              </CCard>
              <CCard
                className="p-4"
                style={{
                  flex: '0 0 45%',
                  maxWidth: '45%',
                }}
              >
                <CCardBody>
                  <CForm onSubmit={handleSubmit} noValidate>
                    <h1 className="mb-2">Iniciar sesión</h1>
                    <p className="text-body-secondary">Accede al panel administrativo</p>
                    {error && (
                      <CAlert color="danger" className="mb-4">
                        {error}
                      </CAlert>
                    )}
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        type="email"
                        autoComplete="email"
                        placeholder="Correo electrónico"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </CInputGroup>
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Contraseña"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                      />
                    </CInputGroup>
                    <CRow className="align-items-center">
                      <CCol xs={6} className="d-grid gap-2">
                        <CButton
                          color="primary"
                          type="submit"
                          disabled={isSubmitting || !email || !password}
                        >
                          {isSubmitting ? (
                            <span className="d-inline-flex align-items-center gap-2">
                              <CSpinner size="sm" />
                              Procesando
                            </span>
                          ) : (
                            'Ingresar'
                          )}
                        </CButton>
                      </CCol>
                      <CCol xs={6} className="text-end">
                        <CButton color="link" className="px-0" disabled>
                          ¿Olvidaste tu contraseña?
                        </CButton>
                      </CCol>
                    </CRow>
                  </CForm>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
