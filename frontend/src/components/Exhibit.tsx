import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as backend from '../api/index'
import './ExhibitList.css'
import { addBookmark, isBookmarked, removeBookmark } from '../utils/bookmarks'
import { useUser } from '../contexts/UserContext.ts'
import { TextEditor } from './TextEditor.tsx'
import { MilkdownProvider } from '@milkdown/react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import { type Exhibit } from '../types.ts'

const Exhibit = () => {
  const { id } = useParams<{ id: string }>()
  const [exhibit, setExhibit] = useState<Exhibit | undefined>()
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
    const load = async () => {
      const res = await backend.getExhibitById({ path: { id: Number(id) } })
      setExhibit(res.data)
    }

    void load()
  }, [setExhibit, id])

  useEffect(() => {
    const { title, exhibitor } = exhibit || {}
    const { fullName } = exhibitor || {}
    setDetailName((title && fullName && `${title} (${fullName})`) || '')
  }, [exhibit, setDetailName])

  const handleTitleChange = (e: ContentEditableEvent) =>
    setTitle(e.target.value)

  if (!exhibit) {
    return <p>Lade Ausstellung...</p>
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
