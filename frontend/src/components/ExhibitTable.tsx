import { useNavigate } from 'react-router-dom'
import { ExhibitListItem } from '../types'

interface ExhibitTableProps {
  exhibits: ExhibitListItem[]
}

const ExhibitTable = ({ exhibits }: ExhibitTableProps) => {
  const navigate = useNavigate()

  const handleRowClick = (id: number) => {
    navigate(`/exhibit/${id}`)
  }

  if (!exhibits.length) {
    return <p>Keine Ausstellungen gefunden</p>
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

export default ExhibitTable
