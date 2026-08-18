import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useNavigate } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import LoadInProgress from '@components/LoadInProgress'
import { TableRow, TableCell } from '@components/Table'
import PlainTable from '@components/volunteer/PlainTable'
import {
  clock,
  coverageChip,
  coverageLabel,
  wantsPeople,
  weekday,
  type CoverageSpan,
} from '@components/volunteer/coverage'

const GET_ACTIVITIES = graphql(`
  query GetVolunteerActivitiesForAdmin {
    getVolunteerActivities {
      id
      key
      name
      summary
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
        coverage {
          startTime
          endTime
          count
          unconfirmed
          needed
          status
        }
      }
    }
  }
`)

const VolunteerActivities = () => {
  const navigate = useNavigate()
  /* Coming back from the editor, the cached list would still show what was
     there before it was edited. */
  const { loading, error, data } = useQuery(GET_ACTIVITIES, { fetchPolicy: 'cache-and-network' })

  if (loading) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const activities = data?.getVolunteerActivities ?? []

  /* Every stretch that still wants somebody, across all activities. */
  const gaps = activities
    .flatMap((activity) =>
      activity.periods.flatMap((period) =>
        (period.coverage as CoverageSpan[])
          .filter(wantsPeople)
          .map((span) => ({ activity: activity.name, span })),
      ),
    )
    .sort((a, b) => a.span.startTime.localeCompare(b.span.startTime))

  return (
    <>
      <PageHeading>Mitmachen</PageHeading>

      <ActionBar>
        <Button onClick={() => navigate('/admin/mitmachen/neu')}>Neue Tätigkeit</Button>
      </ActionBar>

      <Card>
        <PlainTable headers={['Tätigkeit', 'Kürzel', 'Zeiträume', 'Ansprechperson', 'Lücken']}>
          {activities.map((activity) => {
            const open = activity.periods.flatMap((period) =>
              (period.coverage as CoverageSpan[]).filter(wantsPeople),
            ).length
            return (
              <TableRow
                key={activity.id}
                onClick={() => navigate(`/admin/mitmachen/${activity.key}`)}>
                <TableCell>{activity.name}</TableCell>
                <TableCell>{activity.key}</TableCell>
                <TableCell>{activity.periods.length}</TableCell>
                <TableCell>{activity.contact?.user.fullName ?? '—'}</TableCell>
                <TableCell>{open ? open : '—'}</TableCell>
              </TableRow>
            )
          })}
        </PlainTable>
        {!activities.length && (
          <p className="p-4 text-gray-500 dark:text-gray-400">
            Noch keine Tätigkeiten. Lege eine an, damit sich jemand eintragen kann.
          </p>
        )}
      </Card>

      {gaps.length > 0 && (
        <>
          <PageHeading>Wo noch jemand fehlt</PageHeading>
          <Card>
            <PlainTable headers={['Wann', 'Tätigkeit', 'Eingetragen', 'Stand']}>
              {gaps.map(({ activity, span }, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {weekday(span.startTime)}, {clock(span.startTime)}–{clock(span.endTime)}
                  </TableCell>
                  <TableCell>{activity}</TableCell>
                  <TableCell>
                    {span.count}
                    {span.needed ? ` von ${span.needed}` : ''}
                    {span.unconfirmed ? ` (${span.unconfirmed} unbestätigt)` : ''}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-1 text-sm ${coverageChip[span.status]}`}>
                      {coverageLabel[span.status]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </PlainTable>
          </Card>
        </>
      )}
    </>
  )
}

export default VolunteerActivities
