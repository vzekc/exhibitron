import React from 'react'
import { useDrop } from 'react-dnd'
import { useExhibitor } from '@contexts/ExhibitorContext'
import type { Session } from './types'

interface TimeSlotProps {
  roomId: string
  timestamp: number
  height: number
  isHourStart: boolean
  sessions: Session[]
  onDrop: (sessionId: string, roomId: string, timestamp: number) => void
  onDoubleClick?: (roomId: string, startTime: number) => void
}

export const TimeSlot: React.FC<TimeSlotProps> = ({
  roomId,
  timestamp,
  height,
  isHourStart,
  sessions,
  onDrop,
  onDoubleClick,
}) => {
  const { exhibitor } = useExhibitor()
  const isAdmin = exhibitor?.user.isAdministrator ?? false

  // Check if this timeslot would cause an overlap
  const canDropHere = (draggedSession: Session) => {
    const duration = draggedSession.endTime - draggedSession.startTime
    const newEndTime = timestamp + duration

    // Don't allow dropping if it would create an overlap
    return !sessions.some((existingSession) => {
      // Skip the session being dragged
      if (existingSession.id === draggedSession.id) return false

      // Only check sessions in the same room
      if (existingSession.roomId !== roomId) return false

      // Check for overlap
      const sessionStart = existingSession.startTime
      const sessionEnd = existingSession.endTime
      return (
        (timestamp >= sessionStart && timestamp < sessionEnd) ||
        (newEndTime > sessionStart && newEndTime <= sessionEnd) ||
        (timestamp <= sessionStart && newEndTime >= sessionEnd)
      )
    })
  }

  // Check if this timeslot is occupied by any session
  const isOccupied = sessions.some(
    (session) =>
      session.roomId === roomId && session.startTime <= timestamp && session.endTime > timestamp,
  )

  const [{ isOver, canDrop }, dropRef] = useDrop(
    {
      accept: 'SESSION',
      canDrop: (item: Session) => canDropHere(item),
      drop: (item: Session) => {
        onDrop(item.id, roomId, timestamp)
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    },
    [roomId, timestamp, sessions],
  )

  return (
    <div
      ref={dropRef as unknown as React.RefObject<HTMLDivElement>}
      style={{ height: `${height}px` }}
      className={`relative ${isAdmin ? 'cursor-pointer' : ''} ${isHourStart ? 'border-t border-gray-300' : ''} ${
        isOver && canDrop ? 'bg-blue-200' : ''
      } ${isOver && !canDrop ? 'bg-red-100 bg-opacity-50' : ''} transition-colors duration-100 ${
        !isOccupied && isAdmin ? 'hover:bg-blue-200' : ''
      }`}
      onDoubleClick={() => !isOccupied && onDoubleClick?.(roomId, timestamp)}
    />
  )
}
