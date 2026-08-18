import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import LoadInProgress from '@components/LoadInProgress'

const CONFIRM_EMAIL = graphql(`
  mutation ConfirmVolunteerEmail($token: String!) {
    confirmVolunteerEmail(token: $token)
  }
`)

/*
 * Where the link in the verification mail lands. It confirms the address, logs
 * the volunteer in, and hands them their shift list.
 */
const ConfirmEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [confirmEmail] = useMutation(CONFIRM_EMAIL)
  const [problem, setProblem] = useState('')
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
      /* The session is now this volunteer's, so everything else knows them. */
      window.location.href = '/mitmachen/meine-schichten'
    }
    void run()
  }, [confirmEmail, token, navigate])

  if (!problem) return <LoadInProgress />

  return (
    <>
      <PageHeading>Anmeldung bestätigen</PageHeading>
      <Card>
        <p>{problem}</p>
        <p className="mt-2">
          <Link to="/mitmachen" className="text-blue-700 dark:text-blue-300">
            Zurück zum Mitmachen
          </Link>
        </p>
      </Card>
    </>
  )
}

export default ConfirmEmail
