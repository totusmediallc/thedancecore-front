import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={7} xl={6}>
            <CCardGroup>
              <CCard className="p-4">
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
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>¿Nuevo por aquí?</h2>
                    <p>
                      Solicita al equipo administrador la creación de tu usuario para acceder al
                      panel de gestión.
                    </p>
                    <Link to="/register">
                      <CButton color="primary" className="mt-3" active tabIndex={-1}>
                        Más información
                      </CButton>
                    </Link>
                  </div>
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
