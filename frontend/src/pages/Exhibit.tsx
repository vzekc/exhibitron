import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import '../components/ExhibitList.css'
import {
  addBookmark,
  isBookmarked,
  removeBookmark,
} from '../utils/bookmarks.ts'
import { TextEditor } from '../components/TextEditor.tsx'
import { MilkdownProvider } from '@milkdown/react'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_DATA = graphql(`
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
        tables {
          number
        }
      }
    }
  }
`)

const Exhibit = () => {
  const { id } = useParams<{ id: string }>()
  const { setDetailName } = useBreadcrumb()
  const [bookmarked, setBookmarked] = useState(isBookmarked(Number(id)))
  const { data, loading, error } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
  })

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

  if (loading) {
    return <p>Lade Ausstellung...</p>
  }

  if (error) {
    return <p>Fehler beim Laden der Ausstellung: {error.message}</p>
  }

  if (!data?.getExhibit) {
    return <p>Ausstellung nicht gefunden</p>
  }

  const exhibit = data?.getExhibit

  return (
    <MilkdownProvider>
      <article>
        <h2>{exhibit.title}</h2>
        <p>Aussteller: {exhibit.exhibitor.user.fullName}</p>
        <p>
          Tisch:{' '}
          {exhibit.table?.number
            ? exhibit.table?.number
            : exhibit.exhibitor.tables
                ?.map((table) => table.number)
                .sort()
                .join(', ')}
        </p>
        <TextEditor markdown={exhibit.text || ''} readonly />
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
