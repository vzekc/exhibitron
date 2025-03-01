import { useNavigate } from 'react-router-dom'
import { ExhibitListItem } from '../types'

type ExhibitDisplayListItem = Omit<
  ExhibitListItem,
  'exhibitorName' | 'exhibitorId'
> & {
  exhibitorName?: string
  exhibitorId?: number
}

interface ExhibitListProps {
  exhibits: ExhibitDisplayListItem[]
  notFoundLabel?: string
}

const ExhibitList = ({ exhibits, notFoundLabel }: ExhibitListProps) => {
  const navigate = useNavigate()
  const sortedExhibits = exhibits.sort((a, b) => {
    const titleA = a.title?.toLowerCase() || ''
    const titleB = b.title?.toLowerCase() || ''
    return titleA.localeCompare(titleB)
  })

  const handleRowClick = (id: number) => {
    navigate(`/exhibit/${id}`)
  }

  if (!exhibits.length) {
    return <p>{notFoundLabel || 'Keine Ausstellungen gefunden'}</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Titel</th>
          <th>Aussteller</th>
          <th>Tisch</th>
        </tr>
      </thead>
      <tbody>
        {sortedExhibits.map((exhibit, index: number) => (
          <tr
            key={index}
            onClick={() => handleRowClick(exhibit.id)}
            className="clickable-row">
            <td>{exhibit.title}</td>
            <td>{exhibit.exhibitorName}</td>
            <td>{exhibit.table || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ExhibitList
