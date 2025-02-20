import { useParams } from 'react-router-dom'
import { use } from 'react'
import exhibitListService from '../services/exhibitListService'
import { ExhibitListItem } from '../types'
import ExhibitTable from './ExhibitTable'

const dataPromise = exhibitListService.fetchExhibits()

const TableSearchResult = () => {
  const { id } = useParams<{ id: string }>()
  const exhibits = use(dataPromise) as ExhibitListItem[]
  const tableId = Number(id)

  const tableExhibits = exhibits.filter((exhibit) => exhibit.table === tableId)
  const userExhibits = exhibits.filter(
    (exhibit) =>
      exhibit.exhibitorName === tableExhibits[0]?.exhibitorName &&
      exhibit.table !== tableId,
  )

  if (!tableExhibits.length) {
    return <p>Kein Ausstellung für diesen Tisch gefunden</p>
  }

  return (
    <article>
      <h2>Benutzer: {tableExhibits[0].exhibitorName}</h2>
      {tableExhibits.length && (
        <section>
          <h3>Ausstellungen auf Tisch {tableId}</h3>
          <ExhibitTable exhibits={tableExhibits} />
        </section>
      )}
      {userExhibits.length && (
        <section>
          <h3>Andere Ausstellungen des Benutzers</h3>
          <ExhibitTable exhibits={userExhibits} />
        </section>
      )}
    </article>
  )
}

export default TableSearchResult
