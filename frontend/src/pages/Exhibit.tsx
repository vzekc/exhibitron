import { useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ExhibitorDetails from '../components/ExhibitorDetails.tsx'
import ExhibitDetails from '../components/ExhibitDetails.tsx'
import { addBookmark, isBookmarked, removeBookmark } from '../utils/bookmarks.ts'
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
          id
          fullName
          contacts {
            email
            phone
            mastodon
            website
          }
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
  const [bookmarked, setBookmarked] = useState(isBookmarked('exhibits', { id: Number(id) }))
  const { data, loading, error } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
  })
  const location = useLocation()

  const handleBookmark = () => {
    if (!data!.getExhibit) {
      return
    }
    if (bookmarked) {
      removeBookmark('exhibits', { id: Number(id) })
    } else {
      addBookmark('exhibits', data!.getExhibit)
    }
    setBookmarked(!bookmarked)
  }

  useEffect(() => {
    if (data?.getExhibit) {
      const { title, exhibitor } = data.getExhibit
      setDetailName(location.pathname, `${title} (${exhibitor.user.fullName})`)
    }
  }, [data, setDetailName, location])

  if (loading) {
    return <p>Lade Exponat...</p>
  }

  if (error) {
    return <p>Fehler beim Laden des Exponats: {error.message}</p>
  }

  if (!data?.getExhibit) {
    return <p>Exponat nicht gefunden</p>
  }

  const exhibit = data?.getExhibit

  return (
    <div>
      <article>
        <ExhibitDetails id={exhibit.id} />
        <ExhibitorDetails id={exhibit.exhibitor.id} />
        <button onClick={handleBookmark} className="button image-only-button">
          <img
            src={bookmarked ? '/bookmarked.svg' : '/bookmark.svg'}
            className="button-image inverted-image"></img>
        </button>
      </article>
    </div>
  )
}

export default Exhibit
