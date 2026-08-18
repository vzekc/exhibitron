import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import LoadInProgress from '@components/LoadInProgress'

const CONFIRM_EMAIL = graphql(`
  mutation ConfirmVolunteerEmail($token: String!) {
    confirmVolunteerEmail(token: $token)
  }
`)

/*
 * Where the link in the verification mail lands. It confirms the address and
 * opens the session, so from here on this volunteer can sign up for shifts.
 * Afterwards they log in with the address and the password they chose while
 * registering; a link clicked again simply carries them to the plan.
 */
const ConfirmEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [confirmEmail] = useMutation(CONFIRM_EMAIL)
  const [problem, setProblem] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    if (!token) {
      setProblem('Dieser Link ist unvollständig. Bitte öffne ihn noch einmal aus der E-Mail.')
      return
    }

    const run = async () => {
      const result = await confirmEmail({ variables: { token } })
      if (result.errors?.length) {
        setProblem(result.errors[0]?.message ?? 'Unbekannter Fehler')
        return
      }
      /* Only the first click has something to tell; later ones are somebody
         coming back through the link in their mail. */
      if (result.data?.confirmVolunteerEmail) {
        setConfirmed(true)
        return
      }
      window.location.href = '/mitmachen'
    }
    void run()
  }, [confirmEmail, token])

  if (problem) {
    return (
      <>
        <PageHeading>Anmeldung bestätigen</PageHeading>
        <Card>
          <p>{problem}</p>
          <p className="mt-2">
            <Link to="/mitmachen" className="text-blue-700 dark:text-blue-300">
              Zurück zum Plan
            </Link>
          </p>
        </Card>
      </>
    )
  }

  if (!confirmed) return <LoadInProgress />

  return (
    <>
      <PageHeading>Danke!</PageHeading>
      <Card className="space-y-3">
        <p>Deine E-Mail-Adresse ist bestätigt. Du kannst Dich jetzt für Schichten eintragen.</p>
        <p>
          <a
            href="/mitmachen"
            className="inline-block rounded bg-blue-600/80 px-4 py-2 text-white hover:bg-blue-600">
            Weiter zum Plan
          </a>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Künftig meldest Du Dich mit Deiner E-Mail-Adresse und Deinem Kennwort an.
        </p>
      </Card>
    </>
  )
}

export default ConfirmEmail
