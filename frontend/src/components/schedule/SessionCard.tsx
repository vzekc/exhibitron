import React, { useRef } from 'react'
import { useDrag, DragSourceMonitor } from 'react-dnd'
import type { Session } from './types'
import { useExhibitor } from '@contexts/ExhibitorContext'
import { useNavigate } from 'react-router-dom'

interface SessionCardProps {
  session: Session
  timeSlotHeight: number
  onDoubleClick?: (session: Session) => void
}

interface DraggedSession extends Session {
  grabOffset: number
}

const SessionCard: React.FC<SessionCardProps> = ({ session, timeSlotHeight, onDoubleClick }) => {
  const { exhibitor } = useExhibitor()
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const durationInMinutes = (session.endTime - session.startTime) / (1000 * 60)
  const numberOfSlots = durationInMinutes / 15 // 15 minutes per slot
  const height = numberOfSlots * timeSlotHeight

  const [{ isDragging }, dragRef] = useDrag<DraggedSession, unknown, { isDragging: boolean }>({
    type: 'SESSION',
    item: (monitor: DragSourceMonitor) => {
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset || !cardRef.current) return { ...session, grabOffset: 0 }

      const cardRect = cardRef.current.getBoundingClientRect()
      return {
        ...session,
        grabOffset: clientOffset.y - cardRect.top,
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => exhibitor?.user.isAdministrator ?? false,
    previewOptions: {
      anchorX: 0,
      anchorY: 0,
    },
  })

  const handleClick = () => {
    if (!exhibitor?.user.isAdministrator) {
      navigate(`/session/${session.id}`)
    }
  }

  const handleDoubleClick = () => {
    if (exhibitor?.user.isAdministrator) {
      onDoubleClick?.(session)
    } else {
      navigate(`/session/${session.id}`)
    }
  }

  return (
    <div
      ref={(node) => {
        dragRef(node)
        cardRef.current = node
      }}
      className={`absolute inset-x-1 z-10 ${exhibitor?.user.isAdministrator ? 'cursor-move' : 'cursor-pointer'} overflow-hidden rounded px-2 ${durationInMinutes === 15 ? 'py-0 leading-none' : 'py-1'} text-sm ${isDragging ? 'hidden' : ''} `}
      style={{
        height: `${height}px`,
        backgroundColor: 'rgb(219 234 254)',
        opacity: isDragging ? 0.2 : 1,
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}>
      <div className={`font-medium ${durationInMinutes === 15 ? '-mt-0.5 mb-0' : ''}`}>
        {session.title}
      </div>
      <div className={`text-xs truncate text-gray-600 ${durationInMinutes === 15 ? '-mt-1' : ''}`}>
        {session.presenter}
      </div>
    </div>
  )
}

export default SessionCard
