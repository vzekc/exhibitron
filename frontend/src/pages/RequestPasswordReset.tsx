import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { requestPasswordReset } from '../utils/requestPasswordReset.ts'

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
    <article>
      <h2>Passwort zurücksetzen</h2>
      {requestSent ? (
        <p>Wir haben Dir eine E-Mail mit einem Link zum Zurücksetzen Deines Passworts geschickt.</p>
      ) : (
        <>
          <p>
            Wenn Du Dein Passwort vergessen hast, gib bitte Deine E-Mail-Adresse ein. Du erhältst
            dann eine E-Mail mit einem Link, um Dein Passwort zurückzusetzen.
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
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
