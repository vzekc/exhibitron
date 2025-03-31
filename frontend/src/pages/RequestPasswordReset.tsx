import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { requestPasswordReset } from '@utils/requestPasswordReset.ts'
import PageHeading from '@components/PageHeading'
import '@styles/auth.css'

type Inputs = {
  email: string
}

const RequestPasswordReset = () => {
  const { register, handleSubmit } = useForm<Inputs>()
  const [requestSent, setRequestSent] = useState(false)

  const onSubmit = async ({ email }: Inputs) => {
    await requestPasswordReset(email)
    setRequestSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="auth-container">
        <article>
          <header className="mb-8">
            <PageHeading>Passwort zurücksetzen</PageHeading>
          </header>
          {requestSent ? (
            <div className="text-center">
              <p className="text-base text-gray-700">
                Wir haben Dir eine E-Mail mit einem Link zum Zurücksetzen Deines Passworts
                geschickt.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-base text-gray-700">
                Wenn Du Dein Passwort vergessen hast, gib bitte Deine E-Mail-Adresse ein. Du
                erhältst dann eine E-Mail mit einem Link, um Dein Passwort zurückzusetzen.
              </p>
              <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
                <div className="auth-form-group">
                  <label htmlFor="email" className="auth-label">
                    E-Mail Adresse
                    <input
                      id="email"
                      type="email"
                      className="auth-input"
                      {...register('email', { required: true })}
                    />
                  </label>
                </div>
                <button type="submit" className="auth-button">
                  Passwort zurücksetzen
                </button>
              </form>
            </>
          )}
        </article>
      </div>
    </div>
  )
}

export default RequestPasswordReset
