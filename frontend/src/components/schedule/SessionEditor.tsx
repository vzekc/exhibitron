import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import FormInput from '@components/FormInput.tsx'
import FormFieldset from '@components/FormFieldset'
import DaySelector from '@components/DaySelector'
import DurationSelector from '@components/DurationSelector'
import TimeSelector from '@components/TimeSelector'
import MultipleExhibitorSelector from '@components/MultipleExhibitorSelector'
import RoomSelector from '@components/RoomSelector'
import Button from '@components/Button'
import Confirm from '@components/Confirm'
import TextEditor, { TextEditorHandle } from '@components/TextEditor'
import ActionBar from '@components/ActionBar'
import { Exhibitor } from '../../types/exhibitor'
import { useExhibitor } from '@contexts/ExhibitorContext'
import { useUnsavedChangesWarning } from '@hooks/useUnsavedChangesWarning'

const GET_SCHEDULE_DATA = graphql(`
  query GetScheduleData {
    getRooms {
      id
      name
    }
    getConferenceSessions {
      id
      title
      startTime
      endTime
      room {
        id
        name
      }
      exhibitors {
        id
        user {
          fullName
          nickname
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
          nickname
        }
      }
    }
  }
`)

const CREATE_PRESENTATION = graphql(`
  mutation CreateConferenceSession($input: CreateConferenceSessionInput!) {
    createConferenceSession(input: $input) {
      id
      title
      description
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
  mutation UpdateConferenceSession($id: Int!, $input: UpdateConferenceSessionInput!) {
    updateConferenceSession(id: $id, input: $input) {
      id
      title
      description
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

const DELETE_PRESENTATION = graphql(`
  mutation DeleteConferenceSession($id: Int!) {
    deleteConferenceSession(id: $id)
  }
`)

interface Session {
  id: string
  title: string
  startTime: number
  endTime: number
  roomId: string
  exhibitorIds: string[]
  description?: string
}

interface SessionEditorProps {
  isOpen: boolean
  onClose: () => void
  sessionToEdit?: Session
  initialRoomId?: string
  initialStartTime?: number
  onSessionCreated?: () => void
  onSessionUpdated?: () => void
  onSessionDeleted?: () => void
}

const START_HOUR = 9
const END_HOUR = 22
const TIME_SLOT_MINUTES = 15

const SessionEditor: React.FC<SessionEditorProps> = ({
  onClose,
  sessionToEdit,
  initialRoomId,
  initialStartTime,
  onSessionCreated,
  onSessionUpdated,
  onSessionDeleted,
}) => {
  const { exhibitor } = useExhibitor()
  const { loading, error, data } = useQuery(GET_SCHEDULE_DATA)
  const textEditorRef = useRef<TextEditorHandle>(null)
  const [activeTab, setActiveTab] = useState<'inhalt' | 'planung'>('inhalt')

  const [conferenceSessionTitle, setConferenceSessionTitle] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId ?? '')
  const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [description, setDescription] = useState<string>('')
  const [isTextEdited, setIsTextEdited] = useState(false)

  const [createConferenceSession] = useMutation(CREATE_PRESENTATION, {
    refetchQueries: ['GetScheduleData'],
    onCompleted: () => {
      resetForm()
      onSessionCreated?.()
    },
  })

  const [updateConferenceSession] = useMutation(UPDATE_PRESENTATION, {
    refetchQueries: ['GetScheduleData'],
    onCompleted: () => {
      resetForm()
      onSessionUpdated?.()
    },
  })

  const [deleteConferenceSession] = useMutation(DELETE_PRESENTATION, {
    onCompleted: () => {
      onSessionDeleted?.()
      onClose()
    },
    update: (cache, { data }) => {
      if (!data?.deleteConferenceSession) return

      // Remove the deleted conferenceSession from the cache
      cache.evict({
        id: cache.identify({
          __typename: 'ConferenceSession',
          id: sessionToEdit?.id,
        }),
      })
      cache.gc()
    },
  })

  useEffect(() => {
    if (sessionToEdit) {
      const startDate = new Date(sessionToEdit.startTime)
      setConferenceSessionTitle(sessionToEdit.title)
      setSelectedRoomId(sessionToEdit.roomId)
      setSelectedExhibitorIds(sessionToEdit.exhibitorIds)
      setSelectedDate(startDate.toISOString().split('T')[0])
      setSelectedTime(startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
      setDurationMinutes((sessionToEdit.endTime - sessionToEdit.startTime) / (1000 * 60))
      setDescription(sessionToEdit.description ?? '')
      if (textEditorRef.current) {
        textEditorRef.current.resetEditState()
      }
    } else if (initialStartTime) {
      const startDate = new Date(initialStartTime)
      setSelectedRoomId(initialRoomId ?? '')
      setSelectedDate(startDate.toISOString().split('T')[0])
      setSelectedTime(startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
      setDescription('')
    } else {
      resetForm()
    }
  }, [sessionToEdit, initialStartTime, initialRoomId])

  // Track unsaved changes
  const hasChanges = useMemo(() => {
    if (!sessionToEdit) {
      return (
        conferenceSessionTitle.trim() !== '' ||
        selectedRoomId !== '' ||
        selectedExhibitorIds.length > 0 ||
        selectedDate !== '' ||
        selectedTime !== '' ||
        durationMinutes !== 30 ||
        description !== '' ||
        isTextEdited
      )
    }

    const startDate = new Date(sessionToEdit.startTime)
    return (
      conferenceSessionTitle !== sessionToEdit.title ||
      selectedRoomId !== sessionToEdit.roomId ||
      JSON.stringify(selectedExhibitorIds) !== JSON.stringify(sessionToEdit.exhibitorIds) ||
      selectedDate !== startDate.toISOString().split('T')[0] ||
      selectedTime !==
        startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) ||
      durationMinutes !== (sessionToEdit.endTime - sessionToEdit.startTime) / (1000 * 60) ||
      description !== (sessionToEdit.description ?? '') ||
      isTextEdited
    )
  }, [
    conferenceSessionTitle,
    selectedRoomId,
    selectedExhibitorIds,
    selectedDate,
    selectedTime,
    durationMinutes,
    description,
    isTextEdited,
    sessionToEdit,
  ])

  useUnsavedChangesWarning(hasChanges)

  const rooms = useMemo(
    () =>
      data?.getRooms?.map((room) => ({
        id: room.id.toString(),
        name: room.name,
      })) ?? [],
    [data],
  )

  const exhibitors = useMemo(
    () => (data?.getCurrentExhibition?.exhibitors ?? []) as Exhibitor[],
    [data],
  )

  const exhibitionDates = useMemo(
    () => ({
      startDate: (data?.getCurrentExhibition?.startDate as string) ?? '',
      endDate: (data?.getCurrentExhibition?.endDate as string) ?? '',
    }),
    [data],
  )

  const sessions = useMemo(
    () =>
      data?.getConferenceSessions
        ?.map((conferenceSession) => {
          if (
            !conferenceSession.startTime ||
            !conferenceSession.endTime ||
            !conferenceSession.room?.id
          ) {
            return null
          }

          const startDate = new Date(conferenceSession.startTime as string)
          const endDate = new Date(conferenceSession.endTime as string)

          return {
            id: conferenceSession.id.toString(),
            title: conferenceSession.title,
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            roomId: conferenceSession.room.id.toString(),
            presenter: conferenceSession.exhibitors?.[0]?.user.fullName ?? '',
            exhibitorIds: conferenceSession.exhibitors?.map((e) => e.id.toString()) ?? [],
          }
        })
        .filter((session): session is NonNullable<typeof session> => session !== null) ?? [],
    [data],
  )

  const availableDates = useMemo(() => {
    const dates: string[] = []
    const start = new Date(exhibitionDates.startDate)
    const end = new Date(exhibitionDates.endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }, [exhibitionDates])

  const unavailableTimeSlots = useMemo(() => {
    if (!selectedDate) {
      // If no date is selected, all time slots are unavailable
      const allSlots = new Set<string>()
      for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        const hourString = hour.toString().padStart(2, '0')
        for (let minute = 0; minute < 60; minute += TIME_SLOT_MINUTES) {
          const minuteString = minute.toString().padStart(2, '0')
          allSlots.add(`${hourString}:${minuteString}`)
        }
      }
      return allSlots
    }

    if (!selectedRoomId) {
      // If no room is selected, all time slots are unavailable
      const allSlots = new Set<string>()
      for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        const hourString = hour.toString().padStart(2, '0')
        for (let minute = 0; minute < 60; minute += TIME_SLOT_MINUTES) {
          const minuteString = minute.toString().padStart(2, '0')
          allSlots.add(`${hourString}:${minuteString}`)
        }
      }
      return allSlots
    }

    const date = new Date(selectedDate)
    const dayStart = new Date(date)
    dayStart.setHours(START_HOUR, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(END_HOUR, 0, 0, 0)

    const unavailableSlots = new Set<string>()

    // First, mark all slots that are part of existing sessions as unavailable
    sessions.forEach((session) => {
      if (session.roomId === selectedRoomId) {
        const sessionStart = new Date(session.startTime)
        const sessionEnd = new Date(session.endTime)

        // Only consider sessions on the selected date
        if (
          sessionStart.getFullYear() === date.getFullYear() &&
          sessionStart.getMonth() === date.getMonth() &&
          sessionStart.getDate() === date.getDate()
        ) {
          // Add all time slots that overlap with this session
          for (
            let time = sessionStart;
            time < sessionEnd;
            time.setMinutes(time.getMinutes() + TIME_SLOT_MINUTES)
          ) {
            if (time >= dayStart && time < dayEnd) {
              unavailableSlots.add(
                time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
              )
            }
          }
        }
      }
    })

    // Then, mark slots as unavailable if there isn't enough consecutive time available
    const allSlots: string[] = []
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      const hourString = hour.toString().padStart(2, '0')
      for (let minute = 0; minute < 60; minute += TIME_SLOT_MINUTES) {
        const minuteString = minute.toString().padStart(2, '0')
        allSlots.push(`${hourString}:${minuteString}`)
      }
    }

    // Check each slot to see if there's enough consecutive time available
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i]
      if (unavailableSlots.has(slot)) continue // Skip if already unavailable

      // Calculate how many consecutive slots we need
      const slotsNeeded = durationMinutes / TIME_SLOT_MINUTES
      let hasEnoughConsecutiveSlots = true

      // Check if we have enough consecutive slots available
      for (let j = 0; j < slotsNeeded; j++) {
        const nextSlotIndex = i + j
        if (nextSlotIndex >= allSlots.length || unavailableSlots.has(allSlots[nextSlotIndex])) {
          hasEnoughConsecutiveSlots = false
          break
        }
      }

      if (!hasEnoughConsecutiveSlots) {
        unavailableSlots.add(slot)
      }
    }

    return unavailableSlots
  }, [selectedDate, selectedRoomId, sessions, durationMinutes])

  const resetForm = () => {
    setConferenceSessionTitle('')
    setSelectedRoomId('')
    setSelectedExhibitorIds([])
    setSelectedDate('')
    setSelectedTime('')
    setDurationMinutes(30)
    setDescription('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return

    const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)
    const currentDescription = textEditorRef.current?.getHTML() ?? ''

    if (sessionToEdit) {
      await updateConferenceSession({
        variables: {
          id: parseInt(sessionToEdit.id),
          input: {
            title: conferenceSessionTitle,
            description: currentDescription,
            roomId: parseInt(selectedRoomId),
            exhibitorIds: selectedExhibitorIds.map((id) => parseInt(id)),
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
          },
        },
      })
    } else {
      await createConferenceSession({
        variables: {
          input: {
            title: conferenceSessionTitle,
            description: currentDescription,
            roomId: parseInt(selectedRoomId),
            exhibitorIds: selectedExhibitorIds.map((id) => parseInt(id)),
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
          },
        },
      })
    }

    onClose()
  }

  const handleDelete = async () => {
    if (!sessionToEdit) return
    await deleteConferenceSession({
      variables: {
        id: parseInt(sessionToEdit.id),
      },
    })
    setShowDeleteConfirm(false)
  }

  const isFormValid = () => {
    // Only title is required
    if (!conferenceSessionTitle.trim()) return false

    // If we're editing an existing session and haven't changed the time slot,
    // we don't need to validate the time slot
    if (
      sessionToEdit &&
      selectedDate === new Date(sessionToEdit.startTime).toISOString().split('T')[0] &&
      selectedTime ===
        new Date(sessionToEdit.startTime).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        })
    ) {
      return true
    }

    // If a time slot is selected, validate it
    if (selectedDate && selectedTime) {
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)
      const dayStart = new Date(startDateTime)
      dayStart.setHours(START_HOUR, 0, 0, 0)
      const dayEnd = new Date(startDateTime)
      dayEnd.setHours(END_HOUR, 0, 0, 0)

      // Check if the session is within the allowed time range
      if (startDateTime < dayStart || endDateTime > dayEnd) return false

      // Check if the selected time slot is available
      const timeSlots = unavailableTimeSlots
      const startTimeString = startDateTime.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
      if (timeSlots.has(startTimeString)) return false
    }

    return true
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return <div>No data available</div>

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">
          {sessionToEdit ? 'Session bearbeiten' : 'Neue Session'}
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <FormInput
              id="conferenceSessionTitle"
              value={conferenceSessionTitle}
              onChange={(e) => setConferenceSessionTitle(e.target.value)}
              placeholder="Titel eingeben"
              required
              autoFocus
            />
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('inhalt')}
                className={`border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'inhalt'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}>
                Inhalt
              </button>
              <button
                type="button"
                onClick={() => durationMinutes > 0 && setActiveTab('planung')}
                className={`border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'planung'
                    ? 'border-blue-500 text-blue-600'
                    : durationMinutes > 0
                      ? 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      : 'cursor-not-allowed border-transparent text-gray-300'
                }`}>
                Planung {durationMinutes === 0 && '(Dauer erforderlich)'}
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            <div className={activeTab === 'inhalt' ? 'block' : 'hidden'}>
              <FormFieldset legend="Aussteller">
                <MultipleExhibitorSelector
                  exhibitors={exhibitors}
                  selectedIds={selectedExhibitorIds}
                  onChange={setSelectedExhibitorIds}
                />
              </FormFieldset>

              <FormFieldset legend="Dauer">
                <DurationSelector
                  selectedDuration={durationMinutes}
                  onChange={setDurationMinutes}
                />
              </FormFieldset>

              <FormFieldset legend="Beschreibung">
                <TextEditor
                  ref={textEditorRef}
                  defaultValue={description}
                  onEditStateChange={(edited) => setIsTextEdited(edited)}
                />
              </FormFieldset>
            </div>

            <div className={activeTab === 'planung' && durationMinutes > 0 ? 'block' : 'hidden'}>
              <FormFieldset legend="Raum">
                <RoomSelector
                  rooms={rooms}
                  selectedId={selectedRoomId}
                  onChange={setSelectedRoomId}
                />
              </FormFieldset>

              <FormFieldset legend="Zeitplan">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="selectedDate"
                      className="mb-1 block text-sm font-medium text-gray-700">
                      Datum
                    </label>
                    <DaySelector
                      availableDates={availableDates}
                      selectedDate={selectedDate}
                      onChange={setSelectedDate}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="selectedTime"
                      className="mb-1 block text-sm font-medium text-gray-700">
                      Startzeit
                    </label>
                    <TimeSelector
                      startHour={START_HOUR}
                      endHour={END_HOUR}
                      timeSlotMinutes={TIME_SLOT_MINUTES}
                      selectedTime={selectedTime}
                      onChange={setSelectedTime}
                      unavailableTimeSlots={unavailableTimeSlots}
                    />
                  </div>
                </div>
              </FormFieldset>
            </div>
          </div>
        </form>
      </div>

      {exhibitor?.user.isAdministrator && (
        <ActionBar>
          {sessionToEdit && (
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} type="button">
              Löschen
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} type="button">
            Abbrechen
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={!isFormValid()}>
            {sessionToEdit ? 'Speichern' : 'Hinzufügen'}
          </Button>
        </ActionBar>
      )}

      <Confirm
        isOpen={showDeleteConfirm}
        title="Session löschen"
        message="Möchtest Du die Session wirklich löschen?"
        confirm="Löschen"
        cancel="Abbrechen"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}

export default SessionEditor
