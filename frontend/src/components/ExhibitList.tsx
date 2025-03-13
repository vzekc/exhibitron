import { useNavigate } from 'react-router-dom'

type ExhibitDisplayListItem = {
  id: number
  title: string
  exhibitorName?: string
  exhibitor?: {
    user: {
      fullName: string
    }
  }
  table: { number: number } | null
}

interface ExhibitListProps {
  exhibits: ExhibitDisplayListItem[]
  onClick?: (id: number) => void
  notFoundLabel?: string
}

const ExhibitList = ({
  exhibits,
  notFoundLabel,
  onClick,
}: ExhibitListProps) => {
  const navigate = useNavigate()
  const sortedExhibits = [...exhibits].sort((a, b) => {
    const titleA = a.title?.toLowerCase() || ''
    const titleB = b.title?.toLowerCase() || ''
    return titleA.localeCompare(titleB)
  })

  const handleRowClick = onClick || ((id: number) => navigate(`/exhibit/${id}`))

  if (!exhibits.length) {
    return <p>{notFoundLabel || 'Keine Exponate gefunden'}</p>
  }

  const getExhibitorName = (exhibitor: ExhibitDisplayListItem) =>
    exhibitor.exhibitorName || exhibitor.exhibitor?.user.fullName

  const someNames = exhibits.some(getExhibitorName)

  return (
    <table>
      <thead>
        <tr>
          <th>Titel</th>
          {someNames && <th>Aussteller</th>}
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
            {someNames && <td>{getExhibitorName(exhibit)}</td>}
            <td>{exhibit.table?.number || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ExhibitList
