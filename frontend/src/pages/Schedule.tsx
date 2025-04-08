import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import LoadInProgress from '@components/LoadInProgress'
import MultiDayScheduleGrid from '@components/schedule/MultiDayScheduleGrid.tsx'
import AddRoomModal from '@components/schedule/AddRoomModal'
import { useNavigate } from 'react-router-dom'
import { useBreadcrumb } from '@contexts/BreadcrumbContext'
import { useExhibitor } from '@contexts/ExhibitorContext'
import type { Session } from '@components/schedule/types'
import Button from '@components/Button'
import ActionBar from '@components/ActionBar'

const START_HOUR = 9
const END_HOUR = 22
const TIME_SLOT_MINUTES = 15

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
        }
      }
    }
    getCurrentExhibition {
      id
      key
      title
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

const Schedule = () => {
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const { exhibitor } = useExhibitor()
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false)
  const { loading, error, data } = useQuery(GET_SCHEDULE_DATA)
  const [updateConferenceSession] = useMutation(UPDATE_PRESENTATION, {
    refetchQueries: ['GetScheduleData'],
    optimisticResponse: (variables) => {
      const session = sessions.find((s) => s.id === variables.id.toString())
      if (!session) {
        // Return a valid response even if session not found
        return {
          updateConferenceSession: {
            __typename: 'ConferenceSession',
            id: variables.id,
            title: '',
            description: null,
            startTime: variables.input.startTime,
            endTime: variables.input.endTime,
            room: {
              __typename: 'Room',
              id: variables.input.roomId ?? 0,
            },
            exhibitors: null,
          },
        }
      }

      return {
        updateConferenceSession: {
          __typename: 'ConferenceSession',
          id: variables.id,
          title: session.title,
          description: null,
          startTime: variables.input.startTime,
          endTime: variables.input.endTime,
          room: {
            __typename: 'Room',
            id: variables.input.roomId ?? 0,
          },
          exhibitors: session.exhibitorIds.map((id) => ({
            __typename: 'Exhibitor',
            id: parseInt(id),
            user: {
              __typename: 'User',
              fullName: session.presenter,
            },
          })),
        },
      }
    },
  })

  useEffect(() => {
    setDetailName(location.pathname, 'Zeitplan')
  }, [setDetailName])

  const handleSessionEdit = (session: Session) => {
    if (exhibitor?.user.isAdministrator) {
      navigate(`/admin/session/${session.id}`)
    } else {
      navigate(`/session/${session.id}`)
    }
  }

  const handleSessionCreate = (roomId: string, startTime: number) => {
    if (exhibitor?.user.isAdministrator) {
      navigate(`/admin/session/new?roomId=${roomId}&startTime=${startTime}`)
    }
  }

  const handleSessionReschedule = async (
    sessionId: string,
    newRoomId: string,
    newStartTime: number,
  ) => {
    if (!exhibitor?.user.isAdministrator) return

    const session = sessions.find((s) => s.id === sessionId)
    if (!session) return

    const duration = session.endTime - session.startTime
    const newEndTime = newStartTime + duration

    await updateConferenceSession({
      variables: {
        id: parseInt(sessionId),
        input: {
          roomId: parseInt(newRoomId),
          startTime: new Date(newStartTime).toISOString(),
          endTime: new Date(newEndTime).toISOString(),
        },
      },
    })
  }

  const handleDownloadICal = () => {
    window.location.href = '/api/schedule'
  }

  if (loading) return <LoadInProgress />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!data) return <div className="text-red-600">No data available</div>

  const sessions =
    data.getConferenceSessions
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
      .filter((session): session is NonNullable<typeof session> => session !== null) ?? []

  const rooms =
    data.getRooms?.map((room) => ({
      id: room.id.toString(),
      name: room.name,
    })) ?? []

  const exhibitionDates = {
    startDate: (data.getCurrentExhibition?.startDate as string) ?? '',
    endDate: (data.getCurrentExhibition?.endDate as string) ?? '',
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="relative z-0 p-4">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Zeitplan</h1>
            <a
              href="/api/schedule"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <svg
                className="mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Zeitplan exportieren
            </a>
          </div>
          <div>
            <MultiDayScheduleGrid
              rooms={rooms}
              sessions={sessions}
              exhibitionDates={exhibitionDates}
              startHour={START_HOUR}
              endHour={END_HOUR}
              timeSlotMinutes={TIME_SLOT_MINUTES}
              onSessionEdit={handleSessionEdit}
              onSessionCreate={exhibitor?.user.isAdministrator ? handleSessionCreate : undefined}
              onSessionReschedule={
                exhibitor?.user.isAdministrator ? handleSessionReschedule : undefined
              }
            />
          </div>
        </div>
      </div>

      {exhibitor?.user.isAdministrator && (
        <ActionBar>
          <Button icon="add-room" onClick={() => setIsAddRoomModalOpen(true)}>
            Raum hinzufügen
          </Button>
          <div className="ml-8 w-40 text-sm text-gray-500">
            Im Kalender doppelklicken, um eine neue Session zu erstellen.
          </div>
          <div className="ml-8 w-40 text-sm text-gray-500">
            Session zum Bearbeiten doppelklicken.
          </div>
          <div className="ml-8 w-40 text-sm text-gray-500">
            Session kann mit Drag & Drop verschoben werden.
          </div>
        </ActionBar>
      )}

      <AddRoomModal isOpen={isAddRoomModalOpen} onClose={() => setIsAddRoomModalOpen(false)} />
    </>
  )
}

export default Schedule
