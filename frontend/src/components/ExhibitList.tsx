import { useNavigate } from 'react-router-dom'
import { ExhibitListItem } from '../types'

interface ExhibitListProps {
  exhibits: ExhibitListItem[]
  notFoundLabel?: string
}

const ExhibitList = ({ exhibits, notFoundLabel }: ExhibitListProps) => {
  const navigate = useNavigate()

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
        {exhibits.map((exhibit, index: number) => (
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
