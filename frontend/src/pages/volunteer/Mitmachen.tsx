import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import LoadInProgress from '@components/LoadInProgress'
import ServerHtmlContent from '@components/ServerHtmlContent'
import VolunteerCalendar, {
  type CalendarActivity,
  type CalendarPeriod,
} from '@components/volunteer/VolunteerCalendar'
import SignUpDialog from '@components/volunteer/SignUpDialog'
import {
  clock,
  coverageChip,
  joinAdjacent,
  wantsPeople,
  weekday,
} from '@components/volunteer/coverage'

const GET_PLAN = graphql(`
  query GetVolunteerPlan {
    getCurrentUser {
      id
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

/* The stretches of a period that still want somebody. */
const gapsOf = (period: CalendarPeriod) => joinAdjacent(period.coverage.filter(wantsPeople))

const Mitmachen = () => {
  const { loading, error, data, refetch } = useQuery(GET_PLAN, { fetchPolicy: 'cache-and-network' })
  const [picked, setPicked] = useState<{
    activity: CalendarActivity
    period: CalendarPeriod
    startTime: Date
  } | null>(null)

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const activities = (data?.getVolunteerActivities ?? []) as unknown as CalendarActivity[]
  const isLoggedIn = !!data?.getCurrentUser

  return (
    <>
      <PageHeading>Mitmachen</PageHeading>

      <Card className="mb-4">
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Die Ausstellung lebt davon, dass viele mit anpacken. Such dir eine Zeit aus, in der du
          helfen kannst — mit deinem Konto, oder mit Namen und E-Mail-Adresse.
        </p>
        <VolunteerCalendar
          activities={activities}
          onPick={(activity, period, startTime) => setPicked({ activity, period, startTime })}
        />
      </Card>

      {activities.map((activity) => (
        <Card key={activity.id} className="mb-4">
          <h2 className="text-xl font-semibold">{activity.name}</h2>
          <p className="text-gray-600 dark:text-gray-400">{activity.summary}</p>

          {activity.description && (
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-700 dark:text-blue-300">
                Was dabei zu tun ist
              </summary>
              <ServerHtmlContent html={activity.description} className="mt-2" />
            </details>
          )}

          {activity.contact && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Fragen? {activity.contact.user.fullName} weiß Bescheid.
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {activity.periods.map((period) => (
              <li
                key={period.id}
                className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-2 dark:border-gray-700">
                <span className="font-medium">
                  {weekday(period.startTime)}, {clock(period.startTime)}–{clock(period.endTime)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {period.neededCount
                    ? `${period.neededCount} Leute gebraucht`
                    : 'beliebig viele willkommen'}
                  {period.note ? ` — ${period.note}` : ''}
                </span>
                {/* The calendar above shows the shape of it; here it is enough
                    to say when somebody is still missing. */}
                <span
                  className={`text-xs rounded px-2 py-1 ${coverageChip[gapsOf(period).length ? 'under' : 'met']}`}>
                  {gapsOf(period).length
                    ? `noch frei: ${gapsOf(period)
                        .map((span) => `${clock(span.startTime)}–${clock(span.endTime)}`)
                        .join(', ')}`
                    : 'besetzt'}
                </span>
                <button
                  type="button"
                  className="rounded bg-blue-600/80 px-3 py-1 text-sm text-white hover:bg-blue-600"
                  onClick={() =>
                    setPicked({
                      activity,
                      period,
                      startTime: new Date(period.startTime),
                    })
                  }>
                  Eintragen
                </button>
                {isLoggedIn && !!period.bookings?.length && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    dabei: {period.bookings.map((booking) => booking.name).join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/mitmachen/meine-schichten" className="text-blue-700 dark:text-blue-300">
          Meine Schichten
        </Link>
      </p>

      {picked && (
        <SignUpDialog
          activity={picked.activity}
          period={picked.period}
          startTime={picked.startTime}
          isLoggedIn={isLoggedIn}
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
