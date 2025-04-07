import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import Modal from '@components/Modal'
import FormInput from '@components/FormInput'
import Button from '@components/Button'

const CREATE_ROOM = graphql(`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      id
      name
    }
  }
`)

interface AddRoomModalProps {
  isOpen: boolean
  onClose: () => void
}

const AddRoomModal = ({ isOpen, onClose }: AddRoomModalProps) => {
  const [roomName, setRoomName] = useState('')
  const [createRoom] = useMutation(CREATE_ROOM, {
    refetchQueries: ['GetScheduleData'],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName) return

    await createRoom({
      variables: {
        input: {
          name: roomName,
        },
      },
    })
    setRoomName('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raum hinzufügen">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="roomName" className="mb-1 block text-sm font-medium text-gray-700">
            Raumname
          </label>
          <FormInput
            id="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Raumnamen eingeben"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Abbrechen
          </Button>
          <Button type="submit">Hinzufügen</Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddRoomModal
