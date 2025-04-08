import { useState } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import ExhibitCard from '@components/ExhibitCard.tsx'
import { addBookmark, isBookmarked, removeBookmark } from '@utils/bookmarks.ts'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import Confirm from '@components/Confirm'
import Button from '@components/Button'
import ActionBar from '@components/ActionBar'
import LoadInProgress from '@components/LoadInProgress'
import { generateAndDownloadPDF } from '@components/ExhibitPDF.tsx'

const GET_DATA = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      exhibitor {
        id
        user {
          id
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
  const { exhibitor: currentUser } = useExhibitor()
  const [bookmarked, setBookmarked] = useState(isBookmarked('exhibits', { id: Number(id) }))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { data, loading, error } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
  })
  const [deleteExhibit] = useMutation(DELETE_EXHIBIT)
  const location = useLocation()
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)

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
    return <LoadInProgress />
  }

  if (error) {
    return (
      <p className="p-4 text-red-600 dark:text-red-400">
        Fehler beim Laden des Exponats: {error.message}
      </p>
    )
  }

  if (!data?.getExhibit) {
    return <p className="p-4 text-gray-600 dark:text-gray-400">Exponat nicht gefunden</p>
  }

  const exhibit = data?.getExhibit
  const canEdit =
    currentUser?.user.isAdministrator || currentUser?.id === exhibit?.exhibitor.user.id

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

  const handlePdfClick = async () => {
    if (isPdfGenerating) return

    try {
      setIsPdfGenerating(true)

      const exhibitId = parseInt(id!)

      await generateAndDownloadPDF({
        id: exhibitId,
        client: apolloClient,
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsPdfGenerating(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg bg-white dark:bg-gray-800">
      <ExhibitCard id={exhibit.id} />
      <ActionBar>
        <Button
          onClick={handleBookmark}
          variant="secondary"
          icon={bookmarked ? 'bookmarked' : 'bookmark'}>
          {bookmarked ? 'Lesezeichen' : 'Lesezeichen'}
        </Button>
        {canEdit && (
          <>
            <Button onClick={handleEdit} variant="secondary" icon="edit">
              Bearbeiten
            </Button>
            <Button
              type="button"
              onClick={handlePdfClick}
              disabled={isPdfGenerating}
              variant="secondary"
              icon="pdf"
              title="Als PDF anzeigen">
              PDF
            </Button>
          </>
        )}
        {canEdit && (
          <Button onClick={handleDelete} variant="danger" icon="delete">
            Löschen
          </Button>
        )}
      </ActionBar>
      <Confirm
        isOpen={showDeleteConfirm}
        title="Exponat löschen"
        message={`Möchtest Du das Exponat "${exhibit.title}" wirklich löschen?`}
        confirm="Löschen"
        cancel="Abbrechen"
        onConfirm={handleConfirmDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

export default Exhibit
