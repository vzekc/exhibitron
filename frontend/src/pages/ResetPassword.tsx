import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import PageHeading from '@components/PageHeading'
import '@styles/auth.css'

const RESET_PASSWORD = graphql(`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password)
  }
`)

type Inputs = {
  password: string
  passwordRepeat: string
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState<string | undefined>()
  const [resetPassword] = useMutation(RESET_PASSWORD)

  const {
    register,
    watch,
    formState: { errors },
    handleSubmit,
  } = useForm<Inputs>()
  const [message, setMessage] = useState<string | undefined>(
    searchParams.get('token') || token ? undefined : 'Ungültiger Link',
  )
  const password = watch('password')

  useEffect(() => {
    const tokenFromParams = searchParams.get('token') as string
    if (tokenFromParams) {
      setToken(tokenFromParams)
      navigate(window.location.pathname, { replace: true })
    }
  }, [token, navigate, searchParams])

  const onSubmit = async ({ password }: Inputs) => {
    if (token) {
      await resetPassword({
        variables: { token, password },
      })
      setMessage('Dein Kennwort wurde zurückgesetzt.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="auth-container">
        <article>
          <header className="mb-8">
            <PageHeading>Neues Passwort setzen</PageHeading>
          </header>
          {message ? (
            <div className="text-center">
              <p className="text-base text-gray-700">{message}</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="auth-form-group">
                <label htmlFor="password" className="auth-label">
                  Neues Kennwort
                  <input
                    id="password"
                    type="password"
                    className="auth-input"
                    {...register('password', {
                      required: 'Kennwort ist erforderlich',
                    })}
                  />
                  {errors.password && <div className="auth-error">{errors.password.message}</div>}
                </label>
              </div>
              <div className="auth-form-group">
                <label htmlFor="passwordRepeat" className="auth-label">
                  Wiederhole neues Kennwort
                  <input
                    id="passwordRepeat"
                    type="password"
                    className="auth-input"
                    {...register('passwordRepeat', {
                      required: 'Kennwortwiederholung ist erforderlich',
                      validate: (value) =>
                        value === password || 'Die Kennwörter stimmen nicht überein',
                    })}
                  />
                  {errors.passwordRepeat && (
                    <div className="auth-error">{errors.passwordRepeat.message}</div>
                  )}
                </label>
              </div>
              <button type="submit" className="auth-button">
                Passwort zurücksetzen
              </button>
            </form>
          )}
        </article>
      </div>
    </div>
  )
}

export default ResetPassword
