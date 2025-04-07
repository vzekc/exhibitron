import React, { useMemo } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import SessionCard from './SessionCard'
import { TimeSlot } from './TimeSlot'
import RoomHeader from './RoomHeader'
import type { Session, Room, TimeSlot as TimeSlotType } from './types'

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

  const handleDrop = async (sessionId: string, roomId: string, timestamp: number) => {
    if (onSessionReschedule) {
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
                    {/* Room columns with hour lines */}
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="relative border-r border-gray-200 last:border-r-0">
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
                              height={SLOT_HEIGHT}
                              isHourStart={slot.isHourStart}
                              sessions={getSessionsForDay(day)}
                              onDrop={handleDrop}
                              onDoubleClick={onSessionCreate}
                            />
                          )
                        })}
                        {/* Sessions */}
                        {getSessionsForDay(day)
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
                                  top: `${minutesFromStart * (HOUR_HEIGHT / 60)}px`,
                                }}>
                                <SessionCard
                                  session={session}
                                  timeSlotHeight={SLOT_HEIGHT}
                                  onDoubleClick={onSessionEdit}
                                />
                              </div>
                            )
                          })}
                      </div>
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
