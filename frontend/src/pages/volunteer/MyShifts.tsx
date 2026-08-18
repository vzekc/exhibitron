import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import Button from '@components/Button'
import LoadInProgress from '@components/LoadInProgress'
import { TableRow, TableCell } from '@components/Table'
import PlainTable from '@components/volunteer/PlainTable'
import { showMessage } from '@components/MessageModalUtil'
import { showConfirm } from '@components/ConfirmUtil'
import { clock, weekday } from '@components/volunteer/coverage'

const GET_MY_SHIFTS = graphql(`
  query GetMyVolunteerShifts {
    getCurrentUser {
      id
      fullName
    }
    getMyVolunteerBookings {
      id
      startTime
      endTime
      confirmed
      period {
        id
        note
        activity {
          id
          key
          name
          contact {
            id
            user {
              fullName
            }
          }
        }
      }
    }
  }
`)

const CANCEL_BOOKING = graphql(`
  mutation CancelVolunteerBooking($id: Int!) {
    cancelVolunteerBooking(id: $id)
  }
`)

const MyShifts = () => {
  const { loading, error, data, refetch } = useQuery(GET_MY_SHIFTS, {
    fetchPolicy: 'cache-and-network',
  })
  const [cancelBooking] = useMutation(CANCEL_BOOKING)

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const bookings = data?.getMyVolunteerBookings ?? []

  const cancel = async (id: number, what: string) => {
    if (!(await showConfirm('Schicht absagen', `Soll „${what}“ wirklich abgesagt werden?`))) return
    const result = await cancelBooking({ variables: { id } })
    if (result.errors?.length) {
      await showMessage('Das ging nicht', result.errors[0]?.message ?? 'Unbekannter Fehler', 'OK')
      return
    }
    await refetch()
  }

  if (!data?.getCurrentUser) {
    return (
      <>
        <PageHeading>Meine Schichten</PageHeading>
        <Card>
          <p>
            Um deine Schichten zu sehen, melde dich an — oder folge dem Link aus der E-Mail, die du
            beim Eintragen bekommen hast.
          </p>
          <p className="mt-2">
            <Link to="/login" className="text-blue-700 dark:text-blue-300">
              Anmelden
            </Link>
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeading>Meine Schichten</PageHeading>

      <Card>
        {bookings.length ? (
          <>
            <PlainTable headers={['Wann', 'Tätigkeit', 'Treffpunkt', 'Ansprechperson', '']}>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    {weekday(booking.startTime as string)}, {clock(booking.startTime as string)}–
                    {clock(booking.endTime as string)}
                    {!booking.confirmed && ' (unbestätigt)'}
                  </TableCell>
                  <TableCell>{booking.period.activity.name}</TableCell>
                  <TableCell>{booking.period.note ?? '—'}</TableCell>
                  <TableCell>{booking.period.activity.contact?.user.fullName ?? '—'}</TableCell>
                  <TableCell>
                    <Button
                      variant="danger"
                      onClick={() => cancel(booking.id, booking.period.activity.name)}>
                      Absagen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </PlainTable>
            <p className="mt-4">
              <a href="/api/volunteer/shifts.ics" className="text-blue-700 dark:text-blue-300">
                In den eigenen Kalender übernehmen
              </a>
            </p>
          </>
        ) : (
          <p>
            Du bist für nichts eingetragen.{' '}
            <Link to="/mitmachen" className="text-blue-700 dark:text-blue-300">
              Wo Hilfe gebraucht wird
            </Link>
          </p>
        )}
      </Card>
    </>
  )
}

export default MyShifts
