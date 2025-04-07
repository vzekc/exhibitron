import React from 'react'
import { useDrag } from 'react-dnd'
import type { Session } from './types'
import { useExhibitor } from '@contexts/ExhibitorContext'
import { useNavigate } from 'react-router-dom'

interface SessionCardProps {
  session: Session
  timeSlotHeight: number
  onDoubleClick?: (session: Session) => void
}

const SessionCard: React.FC<SessionCardProps> = ({ session, timeSlotHeight, onDoubleClick }) => {
  const { exhibitor } = useExhibitor()
  const navigate = useNavigate()
  const durationInMinutes = (session.endTime - session.startTime) / (1000 * 60)
  const numberOfSlots = durationInMinutes / 15 // 15 minutes per slot
  const height = numberOfSlots * timeSlotHeight

  const [{ isDragging }, dragRef] = useDrag({
    type: 'SESSION',
    item: () => {
      return session
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => exhibitor?.user.isAdministrator ?? false,
  })

  const handleDoubleClick = () => {
    if (exhibitor?.user.isAdministrator) {
      onDoubleClick?.(session)
    } else {
      navigate(`/session/${session.id}`)
    }
  }

  return (
    <div
      ref={dragRef as unknown as React.RefObject<HTMLDivElement>}
      className={`absolute inset-x-1 z-10 ${exhibitor?.user.isAdministrator ? 'cursor-move' : 'cursor-pointer'} overflow-hidden rounded px-2 py-1 text-sm ${isDragging ? 'hidden' : ''} `}
      style={{
        height: `${height}px`,
        backgroundColor: 'rgb(219 234 254)',
        opacity: isDragging ? 0.2 : 1,
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}
      onDoubleClick={handleDoubleClick}>
      <div className="font-medium">{session.title}</div>
      <div className="text-xs truncate text-gray-600">{session.presenter}</div>
    </div>
  )
}

export default SessionCard
