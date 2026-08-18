import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import Button from '@components/Button'
import FormInput from '@components/FormInput'
import { showMessage } from '@components/MessageModalUtil'

const REGISTER_VOLUNTEER = graphql(`
  mutation RegisterVolunteer($input: RegisterVolunteerInput!) {
    registerVolunteer(input: $input) {
      outcome
      message
    }
  }
`)

/*
 * Registering as a helper, for somebody who has no account here. Name, address
 * and a password of their own — so that afterwards they log in like everybody
 * else. What comes back says what to do next: look in the mail, or use the
 * login that already exists.
 */
const RegisterHelper = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [sent, setSent] = useState('')
  const [registerVolunteer, { loading }] = useMutation(REGISTER_VOLUNTEER)

  const register = async () => {
    if (!name.trim() || !email.includes('@')) {
      await showMessage(
        'Fast',
        'Bitte gib deinen Namen und eine E-Mail-Adresse an, damit wir dich erreichen können.',
        'OK',
      )
      return
    }
    if (!password) {
      await showMessage('Fast', 'Bitte wähle ein Kennwort.', 'OK')
      return
    }
    if (password !== passwordRepeat) {
      await showMessage('Fast', 'Die Kennwörter stimmen nicht überein.', 'OK')
      return
    }

    const result = await registerVolunteer({
      variables: { input: { name: name.trim(), email: email.trim(), password } },
    })
    if (result.errors?.length) {
      await showMessage('Das ging nicht', result.errors[0]?.message ?? 'Unbekannter Fehler', 'OK')
      return
    }

    const answer = result.data?.registerVolunteer
    if (answer?.outcome === 'verificationSent') {
      setSent(answer.message)
      return
    }

    await showMessage('Bitte melde dich an', answer?.message ?? '', 'OK')
    if (answer?.outcome === 'useForumLogin') {
      window.location.href = `/auth/forum?redirectUrl=${encodeURIComponent('/mitmachen')}`
    }
  }

  return (
    <>
      <PageHeading>Als Helfer registrieren</PageHeading>

      <Card>
        {sent ? (
          <p>{sent}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Damit Du Dich für Schichten eintragen kannst, brauchen wir einen Namen, eine
              E-Mail-Adresse und ein Kennwort. Du bekommst einen Link, mit dem Du die Adresse
              bestätigst — danach meldest Du Dich damit an und kannst Dich eintragen.
            </p>

            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">Dein Name</span>
              <FormInput value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">Deine E-Mail-Adresse</span>
              <FormInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">Kennwort</span>
              <FormInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">Kennwort wiederholen</span>
              <FormInput
                type="password"
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
              />
            </label>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Wer ein Konto im Forum classic-computing.de hat, meldet sich besser damit an —{' '}
              <a href="/auth/forum" className="text-blue-700 dark:text-blue-300">
                über das Forum anmelden
              </a>
              .
            </p>

            <div className="flex gap-2">
              <Button onClick={register} disabled={loading}>
                Registrieren
              </Button>
              <Link to="/mitmachen" className="self-center text-blue-700 dark:text-blue-300">
                Zurück zum Plan
              </Link>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}

export default RegisterHelper
