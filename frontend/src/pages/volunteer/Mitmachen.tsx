import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import LoadInProgress from '@components/LoadInProgress'
import VolunteerCalendar, {
  type CalendarActivity,
  type CalendarPeriod,
  type OwnShift,
} from '@components/volunteer/VolunteerCalendar'
import ActivityDetails from '@components/volunteer/ActivityDetails'
import SignUpDialog from '@components/volunteer/SignUpDialog'
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
        note
        activity {
          id
          name
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
        }
      }
      periods {
        id
        startTime
        endTime
        neededCount
        note
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

const Mitmachen = () => {
  const { loading, error, data, refetch } = useQuery(GET_PLAN, { fetchPolicy: 'cache-and-network' })
  const [picked, setPicked] = useState<{
    activity: CalendarActivity
    period: CalendarPeriod
    startTime: Date
  } | null>(null)
  const [shown, setShown] = useState<CalendarActivity | null>(null)

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
  }))

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
          <p className="mb-4 flex flex-wrap items-center gap-4">
            <Link
              to="/mitmachen/registrieren"
              className="rounded bg-blue-600/80 px-4 py-2 text-white hover:bg-blue-600">
              Als Helfer registrieren
            </Link>
            <Link to="/login" className="text-blue-700 dark:text-blue-300">
              Ich habe schon ein Konto
            </Link>
          </p>
        )}

        <VolunteerCalendar
          activities={activities}
          ownShifts={ownShifts}
          canBook={isLoggedIn}
          onPick={(activity, period, startTime) => setPicked({ activity, period, startTime })}
          onShowDetails={setShown}
        />

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Ein Klick auf den Namen einer Tätigkeit sagt, was dabei zu tun ist.
        </p>
      </Card>

      {isLoggedIn && (
        <Card className="mb-4">
          <h2 className="mb-2 text-xl font-semibold">Deine Schichten</h2>
          {bookings.length ? (
            <ul className="space-y-1">
              {bookings.map((booking) => (
                <li key={booking.id} className="flex flex-wrap gap-3">
                  <span className="font-medium">{booking.period.activity.name}</span>
                  <span>
                    {weekday(booking.startTime as string)}, {clock(booking.startTime as string)}–
                    {clock(booking.endTime as string)}
                  </span>
                  {booking.period.note && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {booking.period.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Du bist noch für nichts eingetragen. Such dir oben eine Zeit aus.
            </p>
          )}
          <p className="mt-3 text-sm">
            <Link to="/mitmachen/meine-schichten" className="text-blue-700 dark:text-blue-300">
              Schichten absagen oder in den eigenen Kalender übernehmen
            </Link>
          </p>
        </Card>
      )}

      {shown && (
        <ActivityDetails
          activity={shown}
          canBook={isLoggedIn}
          onClose={() => setShown(null)}
          onPick={(activity, period, startTime) => {
            setShown(null)
            setPicked({ activity, period, startTime })
          }}
        />
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
