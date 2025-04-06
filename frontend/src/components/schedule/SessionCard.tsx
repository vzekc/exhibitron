import React from 'react'

interface SessionCardProps {
  session: {
    id: string
    title: string
    startTime: number
    endTime: number
    presenter: string
  }
  timeSlotHeight: number
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, timeSlotHeight }) => {
  const durationInMinutes = (session.endTime - session.startTime) / (1000 * 60)
  const numberOfSlots = durationInMinutes / 15 // 15 minutes per slot
  const height = numberOfSlots * timeSlotHeight

  return (
    <div
      className="absolute z-10 overflow-hidden rounded bg-blue-100 px-2 py-1 text-sm"
      style={{
        height: `${height}px`,
        width: '156px',
      }}>
      <div className="truncate font-medium">{session.title}</div>
      <div className="text-xs truncate text-gray-600">{session.presenter}</div>
    </div>
  )
}
