import { useNavigate, useSearchParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useApolloClient } from '@apollo/client'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import Card from '@components/Card.tsx'
import { FormField } from '@components/FormField'
import { FormFieldset } from '@components/FormFieldset'
import { FormInput } from '@components/FormInput'

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
      <Card className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Registrierung abschließen</h2>
        <p className="mb-6 text-gray-700">Bitte wähle, wie Du Dich registrieren möchtest:</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => setRegistrationMethod('password')}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Kennwort setzen
          </button>
          <button
            onClick={handleForumLink}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Mit Account auf forum.classic-computing.de verknüpfen
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Neues Kennwort setzen</h2>
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <FormFieldset title="Kennwort">
          <FormField label="Kennwort" error={error || undefined}>
            <FormInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Kennwort bestätigen" error={error || undefined}>
            <FormInput
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </FormField>
        </FormFieldset>

        <div className="flex justify-center gap-4">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Kennwort setzen
          </button>
          <button
            type="button"
            onClick={() => setRegistrationMethod(null)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Zurück
          </button>
        </div>
      </form>
    </Card>
  )
}

export default SetupExhibitor
