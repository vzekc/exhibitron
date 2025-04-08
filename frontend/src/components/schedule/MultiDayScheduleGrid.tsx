import React, { useMemo, useRef, useState } from 'react'
import { DndProvider, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import SessionCard from './SessionCard'
import { TimeSlot } from './TimeSlot'
import RoomHeader from './RoomHeader'
import type { Session, Room, TimeSlot as TimeSlotType } from './types'

interface DraggedSession extends Session {
  grabOffset: number
}

interface RoomColumnProps {
  room: Room
  day: Date
  timeSlots: TimeSlotType[]
  sessions: Session[]
  startHour: number
  timeSlotHeight: number
  onDrop: (sessionId: string, roomId: string, timestamp: number) => void
  onSessionCreate?: (roomId: string, startTime: number) => void
  onSessionEdit?: (session: Session) => void
}

const RoomColumn: React.FC<RoomColumnProps> = ({
  room,
  day,
  timeSlots,
  sessions,
  startHour,
  timeSlotHeight,
  onDrop,
  onSessionCreate,
  onSessionEdit,
}) => {
  const columnRef = useRef<HTMLDivElement>(null)
  const hourHeight = timeSlotHeight * 4 // 4 slots per hour
  const [hasConflict, setHasConflict] = useState(false)

  const hasSessionOverlap = (
    roomId: string,
    startTime: number,
    endTime: number,
    excludeSessionId?: string,
  ) => {
    const roomSessions = sessions.filter((session) => session.roomId === roomId)
    return roomSessions.some((session) => {
      if (session.id === excludeSessionId) return false
      return (
        (startTime >= session.startTime && startTime < session.endTime) ||
        (endTime > session.startTime && endTime <= session.endTime) ||
        (startTime <= session.startTime && endTime >= session.endTime)
      )
    })
  }

  const [{ isOver }, dropRef] = useDrop({
    accept: 'SESSION',
    hover: (item: DraggedSession, monitor) => {
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset || !columnRef.current) return

      const columnRect = columnRef.current.getBoundingClientRect()
      const relativeY = clientOffset.y - columnRect.top - item.grabOffset

      // Calculate the time based on the hover position
      const minutesFromStart = Math.round(relativeY / (hourHeight / 60) / 15) * 15
      const hoverDate = new Date(day)
      hoverDate.setHours(startHour + Math.floor(minutesFromStart / 60))
      hoverDate.setMinutes(minutesFromStart % 60)
      hoverDate.setSeconds(0)
      hoverDate.setMilliseconds(0)

      const duration = item.endTime - item.startTime

      // Check for conflicts at both the start and end of the session
      const sessionHeight = (duration / (1000 * 60)) * (hourHeight / 60) // height in pixels
      const topEdge = relativeY
      const bottomEdge = relativeY + sessionHeight

      // Convert pixel positions back to timestamps
      const topTime = new Date(day)
      topTime.setHours(startHour + Math.floor(((topEdge / hourHeight) * 60) / 60))
      topTime.setMinutes(Math.floor((topEdge / hourHeight) * 60) % 60)
      topTime.setSeconds(0)
      topTime.setMilliseconds(0)

      const bottomTime = new Date(day)
      bottomTime.setHours(startHour + Math.floor(((bottomEdge / hourHeight) * 60) / 60))
      bottomTime.setMinutes(Math.floor((bottomEdge / hourHeight) * 60) % 60)
      bottomTime.setSeconds(0)
      bottomTime.setMilliseconds(0)

      const conflict = hasSessionOverlap(room.id, topTime.getTime(), bottomTime.getTime(), item.id)
      setHasConflict(conflict)
    },
    canDrop: () => !hasConflict,
    drop: (item: DraggedSession, monitor) => {
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset || !columnRef.current) return

      const columnRect = columnRef.current.getBoundingClientRect()
      const relativeY = clientOffset.y - columnRect.top - item.grabOffset

      // Calculate the time based on the drop position
      const minutesFromStart = Math.round(relativeY / (hourHeight / 60) / 15) * 15
      const dropDate = new Date(day)
      dropDate.setHours(startHour + Math.floor(minutesFromStart / 60))
      dropDate.setMinutes(minutesFromStart % 60)
      dropDate.setSeconds(0)
      dropDate.setMilliseconds(0)

      onDrop(item.id, room.id, dropDate.getTime())
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  })

  return (
    <div
      ref={(node) => {
        dropRef(node)
        columnRef.current = node
      }}
      className={`relative border-r border-gray-200 last:border-r-0 ${
        isOver ? (hasConflict ? 'bg-red-50' : 'bg-blue-50') : ''
      }`}>
      {/* Time slots */}
      {timeSlots.map((slot) => {
        const slotTimestamp = new Date(day)
        slotTimestamp.setHours(Math.floor(slot.minutes / 60))
        slotTimestamp.setMinutes(slot.minutes % 60)
        slotTimestamp.setSeconds(0)
        slotTimestamp.setMilliseconds(0)

        return (
          <TimeSlot
            key={`${room.id}-${slotTimestamp.getTime()}`}
            roomId={room.id}
            timestamp={slotTimestamp.getTime()}
            height={timeSlotHeight}
            isHourStart={slot.isHourStart}
            sessions={sessions}
            onDoubleClick={onSessionCreate}
          />
        )
      })}
      {/* Sessions */}
      {sessions
        .filter((session) => session.roomId === room.id)
        .map((session) => {
          const startTime = new Date(session.startTime)
          const minutesFromStart =
            startTime.getHours() * 60 + startTime.getMinutes() - startHour * 60

          return (
            <div
              key={session.id}
              className="absolute inset-x-2"
              style={{
                top: `${minutesFromStart * (hourHeight / 60)}px`,
              }}>
              <SessionCard
                session={session}
                timeSlotHeight={timeSlotHeight}
                onDoubleClick={onSessionEdit}
              />
            </div>
          )
        })}
    </div>
  )
}

interface MultiDayScheduleGridProps {
  rooms: Room[]
  sessions: Session[]
  exhibitionDates: {
    startDate: string
    endDate: string
  }
  startHour: number
  endHour: number
  timeSlotMinutes: number
  onSessionReschedule?: (
    sessionId: string,
    newRoomId: string,
    newStartTime: number,
  ) => Promise<void>
  onSessionEdit?: (session: Session) => void
  onSessionCreate?: (roomId: string, startTime: number) => void
}

const MultiDayScheduleGrid: React.FC<MultiDayScheduleGridProps> = ({
  rooms,
  sessions,
  exhibitionDates,
  startHour,
  endHour,
  timeSlotMinutes,
  onSessionReschedule,
  onSessionEdit,
  onSessionCreate,
}) => {
  const days = useMemo(() => {
    const days: Date[] = []
    const start = new Date(exhibitionDates.startDate)
    const end = new Date(exhibitionDates.endDate)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000

    for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += ONE_DAY_MS) {
      days.push(new Date(timestamp))
    }

    return days
  }, [exhibitionDates])

  const timeSlots = useMemo(() => {
    const slots: TimeSlotType[] = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeSlotMinutes) {
        const date = new Date()
        date.setHours(hour, minute, 0, 0)
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          timestamp: date.getTime(),
          minutes: hour * 60 + minute,
          isHourStart: minute === 0,
        })
      }
    }
    return slots
  }, [startHour, endHour, timeSlotMinutes])

  const getSessionsForDay = (day: Date) => {
    return sessions.filter((session) => {
      const sessionStart = new Date(session.startTime)
      return (
        sessionStart.getFullYear() === day.getFullYear() &&
        sessionStart.getMonth() === day.getMonth() &&
        sessionStart.getDate() === day.getDate()
      )
    })
  }

  const getSessionsForRoom = (roomId: string) => {
    return sessions.filter((session) => session.roomId === roomId)
  }

  const hasSessionOverlap = (
    roomId: string,
    startTime: number,
    endTime: number,
    excludeSessionId?: string,
  ) => {
    const roomSessions = getSessionsForRoom(roomId)
    return roomSessions.some((session) => {
      if (session.id === excludeSessionId) return false
      return (
        (startTime >= session.startTime && startTime < session.endTime) ||
        (endTime > session.startTime && endTime <= session.endTime) ||
        (startTime <= session.startTime && endTime >= session.endTime)
      )
    })
  }

  const handleDrop = async (sessionId: string, roomId: string, timestamp: number) => {
    if (onSessionReschedule) {
      const session = sessions.find((s) => s.id === sessionId)
      if (!session) return

      const duration = session.endTime - session.startTime
      const newEndTime = timestamp + duration

      // Check for overlaps
      if (hasSessionOverlap(roomId, timestamp, newEndTime, sessionId)) {
        // TODO: Show error message to user
        return
      }

      await onSessionReschedule(sessionId, roomId, timestamp)
    }
  }

  const HOUR_HEIGHT = 64 // pixels per hour
  const SLOT_HEIGHT = HOUR_HEIGHT / 4 // height of each 15-minute slot

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-6">
          {days.map((day) => (
            <div key={day.toISOString()} className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-4 text-xl font-semibold">
                {day.toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <div className="flex">
                {/* Time column */}
                <div className="w-12 flex-none border-r border-gray-200 bg-gray-50">
                  <div className="h-12" /> {/* Empty header cell */}
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.time}
                      style={{ height: `${SLOT_HEIGHT}px` }}
                      className={`flex items-center justify-end pr-2 text-sm ${
                        slot.isHourStart ? 'font-medium text-gray-700' : 'text-transparent'
                      }`}>
                      {slot.time}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div>
                  {/* Room headers */}
                  <div
                    className="grid h-12 border-b border-gray-200"
                    style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(150px, 1fr))` }}>
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-center border-r border-gray-200 px-2 last:border-r-0">
                        <RoomHeader
                          id={room.id}
                          name={room.name}
                          hasSessions={getSessionsForRoom(room.id).length > 0}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Time grid */}
                  <div
                    className="relative grid"
                    style={{
                      gridTemplateColumns: `repeat(${rooms.length}, minmax(150px, 1fr))`,
                      height: `${HOUR_HEIGHT * (endHour - startHour)}px`,
                    }}>
                    {rooms.map((room) => (
                      <RoomColumn
                        key={room.id}
                        room={room}
                        day={day}
                        timeSlots={timeSlots}
                        sessions={getSessionsForDay(day)}
                        startHour={startHour}
                        timeSlotHeight={SLOT_HEIGHT}
                        onDrop={handleDrop}
                        onSessionCreate={onSessionCreate}
                        onSessionEdit={onSessionEdit}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DndProvider>
  )
}

export default MultiDayScheduleGrid
