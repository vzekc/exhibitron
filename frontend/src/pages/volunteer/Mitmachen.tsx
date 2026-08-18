import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link } from 'react-router-dom'
import Button from '@components/Button'
import Modal from '@components/Modal'
import { showConfirm } from '@components/ConfirmUtil'
import { showMessage } from '@components/MessageModalUtil'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import LoadInProgress from '@components/LoadInProgress'
import VolunteerCalendar, {
  type CalendarActivity,
  type CalendarPeriod,
  type OwnShift,
} from '@components/volunteer/VolunteerCalendar'
import ActivityDetails from '@components/volunteer/ActivityDetails'
import ContactHint from '@components/volunteer/ContactHint'
import SignUpDialog from '@components/volunteer/SignUpDialog'
import { TableRow, TableCell } from '@components/Table'
import PlainTable from '@components/volunteer/PlainTable'
import { clock, weekday } from '@components/volunteer/coverage'

const GET_PLAN = graphql(`
  query GetVolunteerPlan {
    getCurrentUser {
      id
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
          contact {
            id
            user {
              fullName
              nickname
              email
              contacts {
                email
              }
            }
          }
        }
      }
    }
    getVolunteerActivities {
      id
      key
      name
      summary
      description
      contact {
        id
        user {
          fullName
          nickname
          email
          contacts {
            email
          }
        }
      }
      periods {
        id
        startTime
        endTime
        neededCount
        coverage {
          startTime
          endTime
          count
          unconfirmed
          needed
          status
        }
        bookings {
          id
          startTime
          endTime
          name
          confirmed
          isMine
        }
      }
    }
  }
`)

const CANCEL_BOOKING = graphql(`
  mutation CancelVolunteerBookingFromPlan($id: Int!) {
    cancelVolunteerBooking(id: $id)
  }
`)

const Mitmachen = () => {
  const { loading, error, data, refetch } = useQuery(GET_PLAN, { fetchPolicy: 'cache-and-network' })
  const [picked, setPicked] = useState<{
    activity: CalendarActivity
    period: CalendarPeriod
    startTime: Date
  } | null>(null)
  const [shown, setShown] = useState<CalendarActivity | null>(null)
  const [ownShift, setOwnShift] = useState<OwnShift | null>(null)
  const [cancelBooking] = useMutation(CANCEL_BOOKING)

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const activities = (data?.getVolunteerActivities ?? []) as unknown as CalendarActivity[]
  const isLoggedIn = !!data?.getCurrentUser
  const bookings = data?.getMyVolunteerBookings ?? []

  const ownShifts: OwnShift[] = bookings.map((booking) => ({
    id: booking.id,
    startTime: booking.startTime as string,
    endTime: booking.endTime as string,
    activityName: booking.period.activity.name,
    contact: booking.period.activity.contact?.user,
  }))

  const cancel = async (shift: OwnShift) => {
    if (
      !(await showConfirm(
        'Schicht absagen',
        `Willst Du „${shift.activityName}“ am ${weekday(shift.startTime)} um ${clock(shift.startTime)} wirklich absagen?`,
        'Ja',
        'Nein',
      ))
    ) {
      return
    }
    const result = await cancelBooking({ variables: { id: shift.id } })
    if (result.errors?.length) {
      await showMessage('Das ging nicht', result.errors[0]?.message ?? 'Unbekannter Fehler', 'OK')
      return
    }
    setOwnShift(null)
    await refetch()
  }

  return (
    <>
      <PageHeading>Mitmachen</PageHeading>

      <Card className="mb-4">
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          {isLoggedIn
            ? 'Hier kannst Du Dich direkt eintragen, um zu helfen.'
            : 'Du musst Dich als Helfer registrieren, damit Du Dich eintragen kannst.'}
        </p>

        {!isLoggedIn && (
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            <Link to="/login" className="text-blue-700 dark:text-blue-300">
              Melde Dich an
            </Link>
            , wenn Du schon als Aussteller oder Helfer registriert bist, oder{' '}
            <Link to="/mitmachen/registrieren" className="text-blue-700 dark:text-blue-300">
              registriere
            </Link>{' '}
            Dich als Helfer.
          </p>
        )}

        <VolunteerCalendar
          activities={activities}
          ownShifts={ownShifts}
          canBook={isLoggedIn}
          onPick={(activity, period, startTime) => setPicked({ activity, period, startTime })}
          onShowDetails={setShown}
          onShowShift={setOwnShift}
        />

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Ein Klick auf den Namen einer Tätigkeit sagt, was dabei zu tun ist.
        </p>
      </Card>

      {isLoggedIn && (
        <Card className="mb-4">
          <h2 className="mb-2 text-xl font-semibold">Deine Schichten</h2>
          {ownShifts.length ? (
            <>
              <PlainTable headers={['Tätigkeit', 'Tag', 'Von–bis', '']}>
                {ownShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.activityName}</TableCell>
                    <TableCell>{weekday(shift.startTime)}</TableCell>
                    <TableCell>
                      {clock(shift.startTime)}–{clock(shift.endTime)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => cancel(shift)}
                        className="text-sm text-red-700 hover:underline dark:text-red-300">
                        absagen
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </PlainTable>
              <p className="mt-3 text-sm">
                <a
                  href="/api/volunteer/shifts.ics"
                  download="meine-schichten.ics"
                  className="text-blue-700 dark:text-blue-300">
                  In den eigenen Kalender übernehmen (.ics)
                </a>
              </p>
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Du bist noch für nichts eingetragen. Such dir oben eine Zeit aus.
            </p>
          )}
        </Card>
      )}

      {shown && <ActivityDetails activity={shown} onClose={() => setShown(null)} />}

      {ownShift && (
        <Modal isOpen onClose={() => setOwnShift(null)} title={ownShift.activityName}>
          <div className="space-y-4 p-4">
            <p>
              {weekday(ownShift.startTime)}, {clock(ownShift.startTime)}–{clock(ownShift.endTime)}
            </p>
            {ownShift.contact && (
              <ContactHint contact={ownShift.contact} activityName={ownShift.activityName} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOwnShift(null)}>
                Schließen
              </Button>
              <Button variant="danger" onClick={() => cancel(ownShift)}>
                Absagen
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {picked && (
        <SignUpDialog
          activity={picked.activity}
          period={picked.period}
          startTime={picked.startTime}
          ownShifts={ownShifts}
          onClose={() => setPicked(null)}
          onBooked={async () => {
            setPicked(null)
            await refetch()
          }}
        />
      )}
    </>
  )
}

export default Mitmachen
