import { useNavigate } from 'react-router-dom'
import './Card.css'

type Attribute = {
  name: string
  value: string
}

export type ExhibitDisplayListItem = {
  id: number
  title: string
  exhibitorName?: string
  exhibitor?: {
    user: {
      fullName: string
    }
  }
  table: { number: number } | null
  attributes?: Attribute[]
}

interface ExhibitListProps {
  exhibits: ExhibitDisplayListItem[]
  onClick?: (id: number) => void
  notFoundLabel?: string
}

const ExhibitList = ({ exhibits, notFoundLabel, onClick }: ExhibitListProps) => {
  const navigate = useNavigate()
  const sortedExhibits = [...exhibits].sort((a, b) => {
    const titleA = a.title?.toLowerCase() || ''
    const titleB = b.title?.toLowerCase() || ''
    return titleA.localeCompare(titleB)
  })

  const handleClick = onClick || ((id: number) => navigate(`/exhibit/${id}`))

  if (!exhibits.length) {
    return <p>{notFoundLabel || 'Keine Exponate gefunden'}</p>
  }

  const getExhibitorName = (exhibitor: ExhibitDisplayListItem) =>
    exhibitor.exhibitorName || exhibitor.exhibitor?.user.fullName

  const someNames = exhibits.some(getExhibitorName)

  return (
    <div className="cards-grid">
      {sortedExhibits.map((exhibit, index: number) => (
        <div key={index} onClick={() => handleClick(exhibit.id)} className="card clickable">
          <div className="card-title">{exhibit.title}</div>
          <div className="card-footer">
            {someNames && <div className="card-subtitle">{getExhibitorName(exhibit)}</div>}
            {exhibit.table && <div>Tisch {exhibit.table.number}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ExhibitList
