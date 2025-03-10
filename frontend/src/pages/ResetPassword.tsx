import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

type Inputs = {
  password: string
  passwordRepeat: string
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState<string | undefined>()

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

  const resetPassword = async ({ password }: Inputs) => {
    if (token) {
      const result = await backend.postUserResetPassword({
        body: { token, password },
        validateStatus: (status) => status === 204 || status == 403,
      })
      setMessage(
        result.status === 204
          ? 'Dein Kennwort wurde zurückgesetzt.'
          : 'Ungültige Anfrage, bitte fordere einen neuen Link an.',
      )
    }
  }

  return (
    <article>
      <h2>Passwort zurücksetzen</h2>
      {message ? (
        <p>{message}</p>
      ) : (
        <>
          <form onSubmit={handleSubmit(resetPassword)}>
            <label>
              Neues Kennwort
              <input
                type="password"
                {...register('password', {
                  required: 'Kennwort ist erforderlich',
                })}
              />
              {errors.password && (
                <div className="validation-message">
                  {errors.password.message}
                </div>
              )}
            </label>
            <label>
              Wiederhole neues Kennwort
              <input
                type="password"
                {...register('passwordRepeat', {
                  required: 'Kennwortwiederholung ist erforderlich',
                  validate: (value) =>
                    value === password ||
                    'Die Kennwörter stimmen nicht überein',
                })}
              />
              {errors.passwordRepeat && (
                <div className="validation-message">
                  {errors.passwordRepeat.message}
                </div>
              )}
            </label>
            <button type="submit">Passwort zurücksetzen</button>
          </form>
        </>
      )}
    </article>
  )
}

export default ResetPassword
