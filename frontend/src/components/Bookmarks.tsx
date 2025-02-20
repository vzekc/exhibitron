import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBookmarks, Exhibit as ExhibitType } from '../utils/bookmarks'

const Bookmarks = () => {
  const navigate = useNavigate()
  const [exhibits, setExhibits] = useState<ExhibitType[]>([])

  useEffect(() => {
    const loadBookmarks = () => {
      const data = getBookmarks()
      setExhibits(data)
    }
    loadBookmarks()
  }, [])

  const handleRowClick = (id: number) => {
    navigate(`/exhibit/${id}`)
  }

  return (
    <article>
      <h2>Meine Lesezeichen</h2>
      <table>
        <thead>
          <tr>
            <th>Titel</th>
            <th>Aussteller</th>
            <th>Tisch</th>
          </tr>
        </thead>
        <tbody>
          {exhibits?.map((exhibit, index: number) => (
            <tr
              key={index}
              onClick={() => handleRowClick(exhibit.id)}
              className="clickable-row">
              <td>{exhibit.title}</td>
              <td>{exhibit.exhibitor.fullName}</td>
              <td>{exhibit.table || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default Bookmarks
