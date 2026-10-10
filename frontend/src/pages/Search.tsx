import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ExhibitorChip from '@components/ExhibitorChip.tsx'
import LoadInProgress from '@components/LoadInProgress'
import PageHeading from '@components/PageHeading.tsx'

/*
 * Was das Suchfeld oben rechts findet. Nennt die Eingabe genau eine Sache —
 * eine Foto-ID, eine Tischnummer, den Forums-Nickname eines Mitwirkenden —,
 * geht es gleich auf deren Seite; sonst stehen hier die Exponate, Mitwirkenden
 * und Vorträge, in denen der Text vorkommt.
 */

export const SEARCH = graphql(
  `
    query Search($query: String!) {
      search(query: $query) {
        target
        exhibits {
          ...ExhibitCard
        }
        exhibitors {
          ...ExhibitorChip
        }
        conferenceSessions {
          id
          title
          startTime
          room {
            id
            name
          }
        }
      }
    }
  `,
  [ExhibitChip.fragment, ExhibitorChip.fragment],
)

const sessionTime = (startTime: unknown) =>
  startTime
    ? new Date(startTime as string).toLocaleString('de-DE', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

const Search = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const navigate = useNavigate()
  const { data, loading, error } = useQuery(SEARCH, { variables: { query }, skip: !query })
  const result = data?.search

  useEffect(() => {
    if (result?.target) navigate(result.target, { replace: true })
  }, [result?.target, navigate])

  if (!query) return <PageHeading>Suche</PageHeading>
  if (error) {
    return (
      <article>
        <PageHeading>Suche nach „{query}“</PageHeading>
        <p>Die Suche ist fehlgeschlagen: {error.message}</p>
      </article>
    )
  }
  if (loading || !result || result.target) return <LoadInProgress />

  const { exhibits, exhibitors, conferenceSessions } = result
  const nothing = !exhibits.length && !exhibitors.length && !conferenceSessions.length

  return (
    <article>
      <PageHeading>Suche nach „{query}“</PageHeading>
      {nothing && (
        <p>
          Nichts gefunden. Gesucht wird nach Foto-ID, Tischnummer und Forums-Nickname und in den
          Exponaten, Mitwirkenden und Vorträgen.
        </p>
      )}
      {exhibits.length > 0 && (
        <section>
          <h2>Exponate</h2>
          <ChipContainer>
            {exhibits.map((exhibit) => (
              <ExhibitChip key={exhibit.id} exhibit={exhibit} />
            ))}
          </ChipContainer>
        </section>
      )}
      {exhibitors.length > 0 && (
        <section>
          <h2>Mitwirkende</h2>
          <ChipContainer>
            {exhibitors.map((exhibitor) => (
              <ExhibitorChip key={exhibitor.id} exhibitor={exhibitor} />
            ))}
          </ChipContainer>
        </section>
      )}
      {conferenceSessions.length > 0 && (
        <section>
          <h2>Vorträge</h2>
          <ul>
            {conferenceSessions.map((session) => (
              <li key={session.id}>
                <Link to={`/session/${session.id}`}>{session.title}</Link>
                {[sessionTime(session.startTime), session.room?.name]
                  .filter(Boolean)
                  .map((detail) => ` · ${detail}`)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

export default Search
