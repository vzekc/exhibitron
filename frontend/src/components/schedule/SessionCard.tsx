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
    item: () => {
      console.log(`[${session.id}] Drag started`)
      return session
    },
    end: (_, monitor) => {
      const didDrop = monitor.didDrop()
      console.log(`[${session.id}] Drag ended - didDrop: ${didDrop}`)
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={dragRef as unknown as React.RefObject<HTMLDivElement>}
      className={`absolute z-10 cursor-move overflow-hidden rounded px-2 py-1 text-sm ${isDragging ? 'hidden' : ''} `}
      style={{
        height: `${height}px`,
        width: '142px',
        backgroundColor: 'rgb(219 234 254)',
        opacity: isDragging ? 0.2 : 1,
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}>
      <div className="truncate font-medium">{session.title}</div>
      <div className="text-xs truncate text-gray-600">{session.presenter}</div>
    </div>
  )
}
