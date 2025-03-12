import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './ExhibitList.css'
import { addBookmark, isBookmarked, removeBookmark } from '../utils/bookmarks'
import { useUser } from '../contexts/UserContext.ts'
import { TextEditor } from './TextEditor.tsx'
import { MilkdownProvider } from '@milkdown/react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_EXHIBIT = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      text
      table {
        number
      }
      exhibitor {
        id
        user {
          fullName
        }
      }
    }
  }
`)

const Exhibit = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const { setDetailName } = useBreadcrumb()
  const [bookmarked, setBookmarked] = useState(isBookmarked(Number(id)))
  const { data, loading, error } = useQuery(GET_EXHIBIT, {
    variables: { id: Number(id) },
  })
  const [title, setTitle] = useState('')

  const handleBookmark = () => {
    if (bookmarked) {
      removeBookmark(Number(id))
    } else {
      addBookmark(data!.getExhibit)
    }
    setBookmarked(!bookmarked)
  }

  useEffect(() => {
    if (data?.getExhibit) {
      const { title, exhibitor } = data.getExhibit
      setDetailName(`${title} (${exhibitor.user.fullName})`)
    }
  }, [data, setDetailName])

  const handleTitleChange = (e: ContentEditableEvent) =>
    setTitle(e.target.value)

  if (loading) {
    return <p>Lade Ausstellung...</p>
  }

  if (error) {
    return <p>Fehler beim Laden der Ausstellung: {error.message}</p>
  }

  if (!data?.getExhibit) {
    return <p>Keine Ausstellung gefunden</p>
  }

  const exhibit = data?.getExhibit
  const editable = user?.id === exhibit.exhibitor.id
  const tables = [1, 2, 3, 4, 5]

  return (
    <MilkdownProvider>
      <article>
        <ContentEditable
          html={exhibit.title}
          disabled={!editable}
          onChange={handleTitleChange}
          tagName="h2"
        />
        <p>Aussteller: {exhibit.exhibitor.user.fullName}</p>
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
          <p>Tisch: {exhibit.table?.number || 'N/A'}</p>
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
