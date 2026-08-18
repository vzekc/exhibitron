import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
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
 * Signing in over at the forum. `helper=1` says that whoever comes back this
 * way wants to help, so an account is opened for them if they have none here —
 * and `redirectUrl` puts them on the plan afterwards rather than back on this
 * page, which is where the referer would send them.
 */
const forumLogin = () =>
  `/auth/forum?helper=1&redirectUrl=${encodeURIComponent(`${window.location.origin}/mitmachen`)}`

/*
 * How somebody without an account here gets one. Nearly everybody who comes
 * has a forum account, so that stands first and large; the address and a
 * password of one's own are for the few who do not, and afterwards they log in
 * like everybody else. What comes back from registering says what to do next:
 * look in the mail, or use the login that already exists.
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
      window.location.href = forumLogin()
    }
  }

  if (sent) {
    return (
      <>
        <PageHeading>Beim Mitmachen anmelden</PageHeading>
        <Card>
          <p>{sent}</p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeading>Beim Mitmachen anmelden</PageHeading>

      <Card className="mb-4">
        <h2 className="text-xl font-semibold">Du hast ein Konto im Forum?</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Dann melde Dich damit an — mehr ist nicht nötig, Du kannst Dich sofort eintragen.
        </p>
        <p className="mt-4">
          <a
            href={forumLogin()}
            className="inline-block rounded bg-blue-600/80 px-4 py-3 text-lg text-white hover:bg-blue-600">
            Über das Forum anmelden
          </a>
        </p>
      </Card>

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Kein Konto im Forum?</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Dann registriere Dich hier mit Namen, E-Mail-Adresse und einem Kennwort. Du bekommst
            einen Link, mit dem Du die Adresse bestätigst — danach meldest Du Dich damit an und
            kannst Dich eintragen.
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

          <div>
            <Button onClick={register} disabled={loading}>
              Registrieren
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}

export default RegisterHelper
