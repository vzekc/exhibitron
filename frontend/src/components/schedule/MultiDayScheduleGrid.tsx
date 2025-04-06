import React, { useMemo } from 'react'
import { SessionCard } from './SessionCard'

interface TimeSlot {
  time: string
  minutes: number
  isHourStart: boolean
}

interface Room {
  id: string
  name: string
}

interface Session {
  id: string
  title: string
  startTime: number
  endTime: number
  roomId: string
  presenter: string
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
}

export const MultiDayScheduleGrid: React.FC<MultiDayScheduleGridProps> = ({
  rooms,
  sessions,
  exhibitionDates,
  startHour,
  endHour,
  timeSlotMinutes,
}) => {
  const days = useMemo(() => {
    const days: Date[] = []
    const start = new Date(exhibitionDates.startDate)
    const end = new Date(exhibitionDates.endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date))
    }

    return days
  }, [exhibitionDates])

  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeSlotMinutes) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
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

  const HOUR_HEIGHT = 64 // pixels per hour
  const SLOT_HEIGHT = HOUR_HEIGHT / 4 // height of each 15-minute slot

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-6">
        {days.map((day) => (
          <div key={day.toISOString()} className="w-[450px] rounded-lg bg-white p-4 shadow">
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
              <div className="w-[350px]">
                {/* Room headers */}
                <div
                  className="grid h-12 border-b border-gray-200"
                  style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(150px, 1fr))` }}>
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-center border-r border-gray-200 font-medium last:border-r-0">
                      {room.name}
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
                      {/* Hour lines */}
                      {timeSlots.map((slot) => (
                        <div
                          key={slot.time}
                          style={{ height: `${SLOT_HEIGHT}px` }}
                          className={`${slot.isHourStart ? 'border-t border-gray-300' : ''}`}
                        />
                      ))}
                      {/* Sessions */}
                      {getSessionsForDay(day)
                        .filter((session) => session.roomId === room.id)
                        .map((session) => {
                          const startTime = new Date(session.startTime)
                          const endTime = new Date(session.endTime)
                          const minutesFromStart =
                            startTime.getHours() * 60 + startTime.getMinutes() - startHour * 60
                          const durationMinutes =
                            (endTime.getTime() - startTime.getTime()) / (1000 * 60)

                          return (
                            <div
                              key={session.id}
                              className="absolute inset-x-2"
                              style={{
                                top: `${minutesFromStart * (HOUR_HEIGHT / 60)}px`,
                                height: `${durationMinutes * (HOUR_HEIGHT / 60)}px`,
                              }}>
                              <SessionCard session={session} timeSlotHeight={SLOT_HEIGHT} />
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
  )
}
