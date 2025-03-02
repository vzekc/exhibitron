import { useForm } from 'react-hook-form'
import * as backend from '../api/index'
import { useState } from 'react'

type Inputs = {
  email: string
}

const RequestPasswordReset = () => {
  const { register, handleSubmit } = useForm<Inputs>()
  const [requestSent, setRequestSent] = useState(false)

  const requestPasswordReset = async ({ email }: Inputs) => {
    await backend.postUserRequestPasswordReset({
      body: { email, resetUrl: '/resetPassword?token=' },
      validateStatus: (status) => status == 204,
    })
    setRequestSent(true)
  }

  return (
    <article>
      <h2>Passwort zurücksetzen</h2>
      {requestSent ? (
        <p>
          Wir haben Dir eine E-Mail mit einem Link zum Zurücksetzen Deines
          Passworts geschickt.
        </p>
      ) : (
        <>
          <p>
            Wenn Du Dein Passwort vergessen hast, gib bitte Deine E-Mail-Adresse
            ein. Du erhältst dann eine E-Mail mit einem Link, um Dein Passwort
            zurückzusetzen.
          </p>
          <form onSubmit={handleSubmit(requestPasswordReset)}>
            <label>
              E-Mail Adresse
              <input type="email" {...register('email', { required: true })} />
            </label>
            <button type="submit">Passwort zurücksetzen</button>
          </form>
        </>
      )}
    </article>
  )
}

export default RequestPasswordReset
