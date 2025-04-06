import React, { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import LoadInProgress from '../../components/LoadInProgress'
import ActionBar from '../../components/ActionBar'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { FormInput } from '../../components/FormInput'
import { MultiDayScheduleGrid } from '../../components/schedule/MultiDayScheduleGrid'

const START_HOUR = 9
const END_HOUR = 19
const TIME_SLOT_MINUTES = 15
const DURATION_STEP_MINUTES = 5

interface Exhibitor {
  id: number
  user: {
    id: number
    fullName: string
  }
}

interface Room {
  id: string
  name: string
  capacity?: number
}

const GET_SCHEDULE_DATA = graphql(`
  query GetScheduleData {
    getRooms {
      id
      name
      capacity
    }
    getPresentations {
      id
      title
      startTime
      endTime
      room {
        id
      }
      exhibitors {
        id
        user {
          fullName
        }
      }
    }
    getCurrentExhibition {
      id
      startDate
      endDate
      exhibitors {
        id
        user {
          id
          fullName
        }
      }
    }
  }
`)

const CREATE_ROOM = graphql(`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) {
      id
      name
      capacity
    }
  }
`)

const CREATE_PRESENTATION = graphql(`
  mutation CreatePresentation($input: CreatePresentationInput!) {
    createPresentation(input: $input) {
      id
      title
      startTime
      endTime
      room {
        id
      }
      exhibitors {
        id
        user {
          fullName
        }
      }
    }
  }
`)

const UPDATE_PRESENTATION = graphql(`
  mutation UpdatePresentation($id: Int!, $input: UpdatePresentationInput!) {
    updatePresentation(id: $id, input: $input) {
      id
      title
      startTime
      endTime
      room {
        id
      }
      exhibitors {
        id
        user {
          fullName
        }
      }
    }
  }
`)

interface AddRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onAddRoom: (name: string, capacity?: number) => Promise<void>
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({ isOpen, onClose, onAddRoom }) => {
  const [roomName, setRoomName] = useState('')
  const [roomCapacity, setRoomCapacity] = useState<number | undefined>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAddRoom(roomName, roomCapacity)
    setRoomName('')
    setRoomCapacity(undefined)
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
        <div>
          <label htmlFor="roomCapacity" className="mb-1 block text-sm font-medium text-gray-700">
            Kapazität (optional)
          </label>
          <FormInput
            id="roomCapacity"
            type="number"
            value={roomCapacity ?? ''}
            onChange={(e) =>
              setRoomCapacity(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            placeholder="Raumkapazität eingeben"
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

interface AddPresentationModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPresentation: (data: {
    title: string
    roomId: string
    exhibitorIds: string[]
    startTime: string
    endTime: string
  }) => Promise<void>
  rooms: Room[]
  exhibitors: Exhibitor[]
  exhibitionDates: {
    startDate: string
    endDate: string
  }
}

const AddPresentationModal: React.FC<AddPresentationModalProps> = ({
  isOpen,
  onClose,
  onAddPresentation,
  rooms,
  exhibitors,
  exhibitionDates,
}) => {
  const [presentationTitle, setPresentationTitle] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<number>(30)

  const availableDates = useMemo(() => {
    const dates: string[] = []
    const start = new Date(exhibitionDates.startDate)
    const end = new Date(exhibitionDates.endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }, [exhibitionDates])

  const availableTimes = useMemo(() => {
    const times: string[] = []
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += TIME_SLOT_MINUTES) {
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
      }
    }
    return times
  }, [])

  const availableDurations = useMemo(() => {
    const durations: number[] = []
    for (let minutes = DURATION_STEP_MINUTES; minutes <= 180; minutes += DURATION_STEP_MINUTES) {
      durations.push(minutes)
    }
    return durations
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return

    const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)

    await onAddPresentation({
      title: presentationTitle,
      roomId: selectedRoomId,
      exhibitorIds: selectedExhibitorIds,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    })

    setPresentationTitle('')
    setSelectedRoomId('')
    setSelectedExhibitorIds([])
    setSelectedDate('')
    setSelectedTime('')
    setDurationMinutes(30)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Präsentation hinzufügen">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="presentationTitle"
            className="mb-1 block text-sm font-medium text-gray-700">
            Präsentationstitel
          </label>
          <FormInput
            id="presentationTitle"
            value={presentationTitle}
            onChange={(e) => setPresentationTitle(e.target.value)}
            placeholder="Titel eingeben"
            required
          />
        </div>
        <div>
          <label htmlFor="selectedRoomId" className="mb-1 block text-sm font-medium text-gray-700">
            Raum
          </label>
          <select
            id="selectedRoomId"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required>
            <option value="">Raum auswählen</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="selectedExhibitorIds"
            className="mb-1 block text-sm font-medium text-gray-700">
            Aussteller
          </label>
          <select
            id="selectedExhibitorIds"
            multiple
            value={selectedExhibitorIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (option) => option.value)
              setSelectedExhibitorIds(values)
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required>
            {exhibitors.map((exhibitor) => (
              <option key={exhibitor.id} value={exhibitor.id}>
                {exhibitor.user.fullName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Strg/Cmd halten um mehrere Aussteller auszuwählen
          </p>
        </div>
        <div>
          <label htmlFor="selectedDate" className="mb-1 block text-sm font-medium text-gray-700">
            Datum
          </label>
          <select
            id="selectedDate"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required>
            <option value="">Datum auswählen</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('de-DE')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="selectedTime" className="mb-1 block text-sm font-medium text-gray-700">
            Startzeit
          </label>
          <select
            id="selectedTime"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required>
            <option value="">Zeit auswählen</option>
            {availableTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="durationMinutes" className="mb-1 block text-sm font-medium text-gray-700">
            Dauer
          </label>
          <select
            id="durationMinutes"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required>
            {availableDurations.map((minutes) => (
              <option key={minutes} value={minutes}>
                {Math.floor(minutes / 60) > 0 ? `${Math.floor(minutes / 60)}h ` : ''}
                {minutes % 60 > 0 ? `${minutes % 60}min` : ''}
              </option>
            ))}
          </select>
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

const ScheduleAdmin: React.FC = () => {
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false)
  const [isAddPresentationModalOpen, setIsAddPresentationModalOpen] = useState(false)

  const { loading, error, data } = useQuery(GET_SCHEDULE_DATA)
  const [createRoom] = useMutation(CREATE_ROOM, {
    refetchQueries: [GET_SCHEDULE_DATA]
  })
  const [createPresentation] = useMutation(CREATE_PRESENTATION, {
    refetchQueries: [GET_SCHEDULE_DATA]
  })
  const [updatePresentation] = useMutation(UPDATE_PRESENTATION, {
    refetchQueries: [GET_SCHEDULE_DATA]
  })

  const handleAddRoom = async (name: string, capacity?: number) => {
    if (!name) return

    await createRoom({
      variables: {
        input: {
          name,
          capacity,
        },
      },
    })
    setIsAddRoomModalOpen(false)
  }

  const handleAddPresentation = async (data: {
    title: string
    roomId: string
    exhibitorIds: string[]
    startTime: string
    endTime: string
  }) => {
    if (
      !data.title ||
      !data.roomId ||
      !data.startTime ||
      !data.endTime ||
      data.exhibitorIds.length === 0
    )
      return

    await createPresentation({
      variables: {
        input: {
          title: data.title,
          roomId: parseInt(data.roomId),
          exhibitorIds: data.exhibitorIds.map((id) => parseInt(id)),
          startTime: data.startTime,
          endTime: data.endTime,
        },
      },
    })
    setIsAddPresentationModalOpen(false)
  }

  const handleSessionReschedule = async (sessionId: string, newRoomId: string, newStartTime: number) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    const duration = session.endTime - session.startTime
    const newEndTime = newStartTime + duration

    await updatePresentation({
      variables: {
        id: parseInt(sessionId),
        input: {
          roomId: parseInt(newRoomId),
          startTime: new Date(newStartTime).toISOString(),
          endTime: new Date(newEndTime).toISOString()
        }
      }
    })
  }

  if (loading) return <LoadInProgress />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!data) return <div className="text-red-600">No data available</div>

  const sessions =
    data.getPresentations
      ?.map((presentation) => {
        if (!presentation.startTime || !presentation.endTime || !presentation.room?.id) {
          return null
        }

        // DateTime scalar is a string in ISO format
        const startDate = new Date(presentation.startTime as string)
        const endDate = new Date(presentation.endTime as string)

        return {
          id: presentation.id.toString(),
          title: presentation.title,
          startTime: startDate.getTime(),
          endTime: endDate.getTime(),
          roomId: presentation.room.id.toString(),
          presenter: presentation.exhibitors?.[0]?.user.fullName ?? 'No presenter',
        }
      })
      .filter((session): session is NonNullable<typeof session> => session !== null) ?? []

  const rooms =
    data.getRooms?.map((room) => ({
      id: room.id.toString(),
      name: room.name,
    })) ?? []

  const exhibitors = (data.getCurrentExhibition?.exhibitors ?? []) as Exhibitor[]
  const exhibitionDates = {
    startDate: (data.getCurrentExhibition?.startDate as string) ?? '',
    endDate: (data.getCurrentExhibition?.endDate as string) ?? '',
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          <h1 className="mb-6 text-2xl font-bold">Zeitplan</h1>
          <div>
            <MultiDayScheduleGrid
              rooms={rooms}
              sessions={sessions}
              exhibitionDates={exhibitionDates}
              startHour={START_HOUR}
              endHour={END_HOUR}
              timeSlotMinutes={TIME_SLOT_MINUTES}
              onSessionReschedule={handleSessionReschedule}
            />
          </div>
        </div>
      </div>

      <ActionBar>
        <Button icon="add-room" onClick={() => setIsAddRoomModalOpen(true)}>
          Raum hinzufügen
        </Button>
        <Button icon="add-presentation" onClick={() => setIsAddPresentationModalOpen(true)}>
          Präsentation hinzufügen
        </Button>
      </ActionBar>

      <AddRoomModal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        onAddRoom={handleAddRoom}
      />

      <AddPresentationModal
        isOpen={isAddPresentationModalOpen}
        onClose={() => setIsAddPresentationModalOpen(false)}
        onAddPresentation={handleAddPresentation}
        rooms={rooms}
        exhibitors={exhibitors}
        exhibitionDates={exhibitionDates}
      />
    </>
  )
}

export default ScheduleAdmin
