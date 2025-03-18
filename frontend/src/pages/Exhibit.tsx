import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ExhibitDetails from '../components/ExhibitDetails.tsx'
import { addBookmark, isBookmarked, removeBookmark } from '../utils/bookmarks.ts'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { useUser } from '../contexts/UserContext.ts'
import Confirm from '../components/Confirm.tsx'
import '../components/Card.css'

const GET_DATA = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      text
      table {
        number
      }
      attributes {
        name
        value
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

const DELETE_EXHIBIT = graphql(`
  mutation DeleteExhibit($id: Int!) {
    deleteExhibit(id: $id)
  }
`)

const Exhibit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const apolloClient = useApolloClient()
  const { setDetailName } = useBreadcrumb()
  const { user: currentUser } = useUser()
  const [bookmarked, setBookmarked] = useState(isBookmarked('exhibits', { id: Number(id) }))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data, loading, error } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
  })
  const [deleteExhibit] = useMutation(DELETE_EXHIBIT)
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
      const { title } = data.getExhibit
      setDetailName(location.pathname, title)
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
  const canEdit = currentUser?.isAdministrator || currentUser?.id === exhibit?.exhibitor.user.id

  const handleEdit = () => {
    navigate(`/user/exhibit/${exhibit.id}`)
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    await deleteExhibit({ variables: { id: exhibit.id } })
    await apolloClient.clearStore()
    navigate('/exhibit')
  }

  return (
    <div>
      <article>
        <ExhibitDetails id={exhibit.id} />
        <div className="button-group">
          <button onClick={handleBookmark} className="button image-only-button">
            <img
              src={bookmarked ? '/bookmarked.svg' : '/bookmark.svg'}
              className="button-image inverted-image"></img>
          </button>
          {canEdit && (
            <>
              <button onClick={handleEdit} className="button image-only-button">
                <img src="/edit.svg" className="button-image inverted-image" />
              </button>
              <button onClick={handleDelete} className="button image-only-button">
                <img src="/delete.svg" className="button-image inverted-image" />
              </button>
            </>
          )}
        </div>
        <Confirm
          isOpen={showDeleteConfirm}
          title="Exponat löschen"
          message={`Möchtest Du das Exponat "${exhibit.title}" wirklich löschen?`}
          confirm="Löschen"
          cancel="Abbrechen"
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      </article>
    </div>
  )
}

export default Exhibit
