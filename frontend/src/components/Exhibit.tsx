import { useParams } from 'react-router-dom'
import { use, useEffect, useState } from 'react'
import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import './ExhibitList.css'
import Cached from './Cached.ts'
import { addBookmark, isBookmarked, removeBookmark } from '../utils/bookmarks'
import { useUser } from '../contexts/userUtils.ts'
import { TextEditor } from './TextEditor.tsx'
import { MilkdownProvider } from '@milkdown/react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useBreadcrumb } from './BreadcrumbContext.tsx'

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
  const { user } = useUser()
  const [title, setTitle] = useState(exhibit?.title || '')
  const { setDetailName } = useBreadcrumb()

  const handleBookmark = () => {
    if (bookmarked) {
      removeBookmark(Number(id))
    } else {
      addBookmark(exhibit!)
    }
    setBookmarked(!bookmarked) // Update the state to trigger a re-render
  }

  useEffect(() => {
    const { title, exhibitor } = response.data || {}
    const { fullName } = exhibitor || {}
    setDetailName((title && fullName && `${title} (${fullName})`) || '')
  }, [response, setDetailName])

  const handleTitleChange = (e: ContentEditableEvent) =>
    setTitle(e.target.value)

  if (!exhibit) {
    return <p>Ausstellung nicht gefunden ({response.status})</p>
  }

  const editable = user?.id === exhibit.exhibitor.id
  const tables = [1, 2, 3, 4, 5]

  return (
    <MilkdownProvider>
      <article>
        <ContentEditable
          html={title}
          disabled={!editable}
          onChange={handleTitleChange}
          tagName="h2"
        />
        <p>Aussteller: {exhibit.exhibitor.fullName}</p>
        {editable ? (
          <select>
            <option value="">Kein Tisch</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                Tisch {table}
              </option>
            ))}
          </select>
        ) : (
          <p>Tisch: {exhibit.table || 'N/A'}</p>
        )}
        {(exhibit.text || editable) && (
          <TextEditor markdown={exhibit.text || ''} readonly={!editable} />
        )}
        <button onClick={handleBookmark} className="button image-only-button">
          <img
            src={bookmarked ? '/bookmarked.svg' : '/bookmark.svg'}
            className="button-image inverted-image"></img>
        </button>
      </article>
    </MilkdownProvider>
  )
}

export default Exhibit
