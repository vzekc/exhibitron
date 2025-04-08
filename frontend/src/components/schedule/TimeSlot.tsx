import React from 'react'
import { useExhibitor } from '@contexts/ExhibitorContext'
import type { Session } from './types'

interface TimeSlotProps {
  roomId: string
  timestamp: number
  height: number
  isHourStart: boolean
  sessions: Session[]
  onDoubleClick?: (roomId: string, startTime: number) => void
}

export const TimeSlot: React.FC<TimeSlotProps> = ({
  roomId,
  timestamp,
  height,
  isHourStart,
  sessions,
  onDoubleClick,
}) => {
  const { exhibitor } = useExhibitor()
  const isAdmin = exhibitor?.user.isAdministrator ?? false

  // Check if this timeslot is occupied by any session
  const isOccupied = sessions.some(
    (session) =>
      session.roomId === roomId && session.startTime <= timestamp && session.endTime > timestamp,
  )

  return (
    <div
      style={{ height: `${height}px` }}
      className={`relative ${isAdmin ? 'cursor-pointer' : ''} ${isHourStart ? 'border-t border-gray-300' : ''} transition-colors duration-100 ${
        !isOccupied && isAdmin ? 'hover:bg-blue-200' : ''
      }`}
      onDoubleClick={() => !isOccupied && onDoubleClick?.(roomId, timestamp)}
    />
  )
}
