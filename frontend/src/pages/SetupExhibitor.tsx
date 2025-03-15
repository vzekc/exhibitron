import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useApolloClient } from '@apollo/client'
import { useUser } from '../contexts/UserContext'

const SET_PASSWORD = graphql(`
  mutation SetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password)
  }
`)

const GET_TOKEN_EMAIL = graphql(`
  query GetTokenEmail($token: String!) {
    getTokenEmail(token: $token)
  }
`)

const LOGIN = graphql(`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      email
      fullName
    }
  }
`)

type RegistrationMethod = 'password' | null

const STORAGE_KEY = 'registration_state'

interface RegistrationState {
  token: string
  inProgress: boolean
}

const SetupExhibitor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { reloadUser, user } = useUser()
  const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apolloClient = useApolloClient()

  // Initialize or restore registration state
  useEffect(() => {
    const storedState = sessionStorage.getItem(STORAGE_KEY)
    const token = searchParams.get('token')

    if (storedState) {
      const state: RegistrationState = JSON.parse(storedState)
      // If we have a stored state and the user is now logged in, registration was successful
      if (state.inProgress && user) {
        sessionStorage.removeItem(STORAGE_KEY)
        navigate('/user/profile')
        return
      }
    }

    if (token) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, inProgress: false }))
    }
  }, [searchParams, user, navigate])

  const token = (() => {
    const storedState = sessionStorage.getItem(STORAGE_KEY)
    if (storedState) {
      return JSON.parse(storedState).token
    }
    return searchParams.get('token')
  })()

  const [setPasswordMutation] = useMutation(SET_PASSWORD)
  const [login] = useMutation(LOGIN)

  if (!token) {
    return <p>Ungültiger Zugriff. Bitte folgen Sie dem Link in Ihrer E-Mail.</p>
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('Die Kennwörter stimmen nicht überein')
      return
    }

    // Get the email associated with the token first
    const { data: emailData } = await apolloClient.query<{ getTokenEmail: string }>({
      query: GET_TOKEN_EMAIL,
      variables: { token },
    })

    if (!emailData.getTokenEmail) {
      setError('Fehler beim Abrufen der E-Mail-Adresse')
      return
    }

    // Set the password (which will invalidate the token)
    await setPasswordMutation({
      variables: { token, password },
    })

    // Log in with the new credentials
    await login({
      variables: {
        email: emailData.getTokenEmail,
        password,
      },
    })
    await apolloClient.clearStore()

    sessionStorage.removeItem(STORAGE_KEY)
    await reloadUser()
    navigate('/user/profile', { replace: true })
  }

  const handleForumLink = () => {
    // Store registration state before redirect
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, inProgress: true }))
    // Redirect to forum OAuth
    window.location.href = `/auth/forum?token=${encodeURIComponent(token)}`
  }

  if (!registrationMethod) {
    return (
      <article>
        <h2>Registrierung abschließen</h2>
        <p>Bitte wähle, wie Du Dich registrieren möchtest:</p>
        <div className="grid">
          <button onClick={() => setRegistrationMethod('password')}>Kennwort setzen</button>
          <button onClick={handleForumLink}>
            Mit Account auf forum.classic-computing.de verknüpfen
          </button>
        </div>
      </article>
    )
  }

  return (
    <article>
      <h2>Neues Kennwort setzen</h2>
      <form onSubmit={handlePasswordSubmit}>
        <label>
          Kennwort:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Kennwort bestätigen:
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="grid">
          <button type="submit">Kennwort setzen</button>
          <button type="button" className="secondary" onClick={() => setRegistrationMethod(null)}>
            Zurück
          </button>
        </div>
      </form>
    </article>
  )
}

export default SetupExhibitor
