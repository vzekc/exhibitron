import { useNavigate, useSearchParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useApolloClient } from '@apollo/client'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

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

const SetupExhibitor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { reloadExhibitor } = useExhibitor()
  const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod>(null)
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apolloClient = useApolloClient()

  const [setPasswordMutation] = useMutation(SET_PASSWORD)
  const [login] = useMutation(LOGIN)

  useEffect(() => {
    const validateToken = async () => {
      // Skip validation if we already have a token and email
      if (token && email) {
        return
      }

      const tokenFromParams = searchParams.get('registrationToken') as string
      if (tokenFromParams) {
        const { data } = await apolloClient.query({
          query: GET_TOKEN_EMAIL,
          variables: { token: tokenFromParams },
        })
        if (data.getTokenEmail) {
          setToken(tokenFromParams)
          setEmail(data.getTokenEmail)
          navigate(window.location.pathname, { replace: true })
          return
        }
        // Only navigate to error page if token is invalid
        navigate(
          `/?login=true&error=${encodeURIComponent('Ungültiges Token oder Anmeldung bereits vollständig')}`,
          { replace: true },
        )
      } else {
        // No token provided
        navigate(`/?login=true&error=${encodeURIComponent('Kein Registrierungstoken angegeben')}`, {
          replace: true,
        })
      }
    }

    void validateToken()
  }, [apolloClient, navigate, searchParams, token, email])

  if (!token || !email) {
    return <p>Token wird geprüft...</p>
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('Die Kennwörter stimmen nicht überein')
      return
    }

    // Set the password (which will invalidate the token)
    await setPasswordMutation({
      variables: { token, password },
    })

    // Log in with the new credentials
    await login({
      variables: {
        email,
        password,
      },
    })
    await apolloClient.clearStore()

    await reloadExhibitor()
    navigate('/user/profile?welcome', { replace: true })
  }

  const handleForumLink = () => {
    // Store registration state before redirect
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, inProgress: true }))
    // Redirect to forum OAuth
    window.location.href = `/auth/forum?registrationToken=${encodeURIComponent(token)}&redirectUrl=${encodeURIComponent(`${window.location.origin}/user/profile?welcome`)}`
  }

  if (!registrationMethod) {
    return (
      <article>
        <h2>Registrierung abschließen</h2>
        <p>Bitte wähle, wie Du Dich registrieren möchtest:</p>
        <div>
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
        {error && <p>{error}</p>}
        <div>
          <button type="submit">Kennwort setzen</button>
          <button type="button" onClick={() => setRegistrationMethod(null)}>
            Zurück
          </button>
        </div>
      </form>
    </article>
  )
}

export default SetupExhibitor
