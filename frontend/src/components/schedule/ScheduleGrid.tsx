import React from 'react'
import { SessionCard } from '@components/schedule/SessionCard'

interface TimeSlot {
  time: string
  timestamp: number
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

interface ScheduleGridProps {
  timeSlots: TimeSlot[]
  rooms: Room[]
  sessions?: Session[]
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ timeSlots, rooms, sessions = [] }) => {
  const gridTemplateColumns = `repeat(${rooms.length}, minmax(0, 1fr))`

  return (
    <div className="relative">
      {/* Time column */}
      <div className="absolute left-0 top-0 w-20 border-r border-gray-200 bg-gray-50">
        <div className="h-12 border-b border-gray-200" /> {/* Empty header cell */}
        {timeSlots.map((slot) => (
          <div
            key={slot.timestamp}
            className="flex h-12 items-center justify-end border-b border-gray-200 pr-2 text-sm text-gray-500">
            {slot.time}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="ml-20">
        {/* Room headers */}
        <div className="grid border-b border-gray-200" style={{ gridTemplateColumns }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex h-12 items-center justify-center border-r border-gray-200 font-medium last:border-r-0">
              {room.name}
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div className="relative">
          {/* Grid lines */}
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns,
              height: `${timeSlots.length * 48}px`, // h-12 = 48px per time slot
            }}>
            {rooms.map((room) => (
              <div key={room.id} className="border-r border-gray-200 last:border-r-0" />
            ))}
          </div>

          {/* Time slot rows */}
          {timeSlots.map((slot) => (
            <div
              key={slot.timestamp}
              className="grid h-12 border-b border-gray-200"
              style={{ gridTemplateColumns }}>
              {rooms.map((room) => (
                <div key={`${slot.timestamp}-${room.id}`} className="relative">
                  {/* Session cards will be rendered here */}
                  {sessions
                    .filter(
                      (session) =>
                        session.roomId === room.id && session.startTime === slot.timestamp,
                    )
                    .map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        timeSlotHeight={48} // h-12 = 48px
                      />
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
