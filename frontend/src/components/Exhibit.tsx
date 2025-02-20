import { useParams } from 'react-router-dom'
import { use, useState } from 'react'
import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import './ExhibitList.css'
import Cached from './Cached.ts'
import { addBookmark, removeBookmark, isBookmarked } from '../utils/bookmarks'

backendClient.setConfig({
  baseURL: '/api',
})

const fetchExhibit = new Cached((id: number) =>
  backend.getExhibitById({ path: { id } }),
)

const Exhibit = () => {
  const { id } = useParams<{ id: string }>()
  const response = use(fetchExhibit.get(Number(id)))
  const exhibit = response.data
  const [bookmarked, setBookmarked] = useState(isBookmarked(Number(id)))

  const handleBookmark = () => {
    if (bookmarked) {
      removeBookmark(Number(id))
    } else {
      addBookmark(exhibit!)
    }
    setBookmarked(!bookmarked) // Update the state to trigger a re-render
  }

  if (!exhibit) {
    return <p>Ausstellung nicht gefunden ({response.status})</p>
  }

  return (
    <article>
      <h2>{exhibit.title}</h2>
      <p>Aussteller: {exhibit.exhibitor.fullName}</p>
      {exhibit.table ? <p>Tisch: {exhibit.table || 'N/A'}</p> : <div></div>}
      {exhibit.text ? <p>Beschreibung: {exhibit.text}</p> : <div></div>}
      <button onClick={handleBookmark}>
        {bookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
      </button>
    </article>
  )
}

export default Exhibit
