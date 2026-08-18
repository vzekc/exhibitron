import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import Button from '@components/Button'
import LoadInProgress from '@components/LoadInProgress'
import { showConfirm } from '@components/ConfirmUtil'
import { showMessage } from '@components/MessageModalUtil'
import { clock, weekday } from '@components/volunteer/coverage'

const GET_ACCOUNT = graphql(`
  query GetHelperAccount {
    getCurrentUser {
      id
      fullName
      email
      nickname
    }
    getMyVolunteerBookings {
      id
      startTime
      endTime
      period {
        id
        activity {
          id
          name
        }
      }
    }
  }
`)

const DELETE_ACCOUNT = graphql(`
  mutation DeleteMyVolunteerAccount {
    deleteMyVolunteerAccount
  }
`)

/*
 * The little a helper has to administer: who they are here, and the way out.
 * Deleting takes the shifts with it, so it says how many there are before
 * asking.
 */
const HelperAccount = () => {
  const { loading, error, data } = useQuery(GET_ACCOUNT, { fetchPolicy: 'cache-and-network' })
  const [deleteAccount] = useMutation(DELETE_ACCOUNT)

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const me = data?.getCurrentUser
  const bookings = data?.getMyVolunteerBookings ?? []

  if (!me) {
    return (
      <>
        <PageHeading>Mein Konto</PageHeading>
        <Card>
          <p>
            Bitte{' '}
            <Link to="/login" className="text-blue-700 dark:text-blue-300">
              melde Dich an
            </Link>
            .
          </p>
        </Card>
      </>
    )
  }

  const remove = async () => {
    const shifts = bookings.length
      ? `${bookings.length === 1 ? 'Deine eingetragene Schicht wird' : `Deine ${bookings.length} eingetragenen Schichten werden`} abgesagt und die Verantwortlichen benachrichtigt. `
      : ''
    if (
      !(await showConfirm(
        'Konto löschen',
        `${shifts}Willst Du Dein Konto wirklich löschen?`,
        'Ja',
        'Nein',
      ))
    ) {
      return
    }

    const result = await deleteAccount()
    if (result.errors?.length) {
      await showMessage('Das ging nicht', result.errors[0]?.message ?? 'Unbekannter Fehler', 'OK')
      return
    }
    await showMessage('Gelöscht', 'Dein Konto ist weg. Danke, dass Du dabei warst!', 'OK')
    window.location.href = '/mitmachen'
  }

  return (
    <>
      <PageHeading>Mein Konto</PageHeading>

      <Card className="space-y-3">
        <p>
          <span className="font-medium">{me.fullName}</span>
          {me.nickname && (
            <span className="text-gray-500 dark:text-gray-400"> (@{me.nickname})</span>
          )}
        </p>
        <p className="text-gray-600 dark:text-gray-400">{me.email}</p>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {bookings.length === 1
            ? 'Du bist für eine Schicht eingetragen:'
            : bookings.length
              ? `Du bist für ${bookings.length} Schichten eingetragen:`
              : 'Du bist für keine Schicht eingetragen.'}
        </p>
        {bookings.length > 0 && (
          <ul className="text-sm text-gray-600 dark:text-gray-400">
            {bookings.map((booking) => (
              <li key={booking.id}>
                {booking.period.activity.name}, {weekday(booking.startTime as string)},{' '}
                {clock(booking.startTime as string)}–{clock(booking.endTime as string)}
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm">
          <Link to="/mitmachen" className="text-blue-700 dark:text-blue-300">
            Zum Plan
          </Link>
        </p>
      </Card>

      <Card className="mt-4 space-y-3">
        <h2 className="text-xl font-semibold">Konto löschen</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Damit verschwinden Dein Name, Deine Adresse und alle Schichten, für die Du Dich
          eingetragen hast. Wer für diese Tätigkeiten zuständig ist, bekommt eine Nachricht.
        </p>
        <div>
          <Button variant="danger" onClick={remove}>
            Konto löschen
          </Button>
        </div>
      </Card>
    </>
  )
}

export default HelperAccount
