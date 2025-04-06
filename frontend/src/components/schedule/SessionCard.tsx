import React from 'react'
import { useDrag } from 'react-dnd'
import type { Session } from './types'

interface SessionCardProps {
  session: Session
  timeSlotHeight: number
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, timeSlotHeight }) => {
  const durationInMinutes = (session.endTime - session.startTime) / (1000 * 60)
  const numberOfSlots = durationInMinutes / 15 // 15 minutes per slot
  const height = numberOfSlots * timeSlotHeight

  const [{ isDragging }, dragRef] = useDrag({
    type: 'SESSION',
    item: session,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }, [session])

  return (
    <div
      ref={dragRef}
      className={`
        absolute z-10 overflow-hidden rounded bg-blue-100 px-2 py-1 text-sm cursor-move
        ${isDragging ? 'opacity-50' : ''}
        transition-opacity duration-200
      `}
      style={{
        height: `${height}px`,
        width: '142px'
      }}>
      <div className="font-medium truncate">{session.title}</div>
      <div className="text-xs text-gray-600 truncate">{session.presenter}</div>
    </div>
  )
}
