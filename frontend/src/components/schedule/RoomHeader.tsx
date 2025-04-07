import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import { showConfirm } from '@components/ConfirmUtil'
import { useExhibitor } from '@contexts/ExhibitorContext'

const DELETE_ROOM = graphql(`
  mutation DeleteRoom($id: Int!) {
    deleteRoom(id: $id)
  }
`)

interface RoomHeaderProps {
  id: string
  name: string
  hasSessions: boolean
}

const RoomHeader = ({ id, name, hasSessions }: RoomHeaderProps) => {
  const { exhibitor } = useExhibitor()
  const [deleteRoom] = useMutation(DELETE_ROOM, {
    refetchQueries: ['GetScheduleData'],
  })

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Raum löschen',
      'Möchten Sie diesen Raum wirklich löschen?',
      'Löschen',
      'Abbrechen',
    )

    if (confirmed) {
      await deleteRoom({
        variables: {
          id: parseInt(id),
        },
      })
    }
  }

  return (
    <div className="flex items-center justify-between">
      <span>{name}</span>
      {!hasSessions && exhibitor?.user.isAdministrator && (
        <button
          onClick={handleDelete}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          title="Raum löschen">
          <img src="/delete.svg" alt="Löschen" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default RoomHeader
