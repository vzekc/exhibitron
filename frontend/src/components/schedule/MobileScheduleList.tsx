import React from 'react'
import type { Session } from './types'

interface MobileScheduleListProps {
  sessions: Session[]
  onSessionEdit?: (session: Session) => void
}

const MobileScheduleList: React.FC<MobileScheduleListProps> = ({ sessions, onSessionEdit }) => {
  const now = Date.now()

  // Filter sessions to only show current and future events
  const currentAndFutureSessions = sessions
    .filter((session) => session.endTime > now)
    .sort((a, b) => a.startTime - b.startTime)

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Heute'
    }

    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen'
    }

    // Otherwise show only the weekday
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
    })
  }

  const getSessionStatus = (session: Session) => {
    const now = Date.now()
    if (now >= session.startTime && now <= session.endTime) {
      return 'current'
    }
    if (now < session.startTime) {
      return 'upcoming'
    }
    return 'past'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'current':
        return 'Läuft jetzt'
      case 'upcoming':
        return 'Bald'
      default:
        return 'Beendet'
    }
  }

  if (currentAndFutureSessions.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Veranstaltungen</h3>
          <p className="mt-1 text-sm text-gray-500">
            Es sind derzeit keine laufenden oder bevorstehenden Veranstaltungen geplant.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {currentAndFutureSessions.map((session) => {
        const status = getSessionStatus(session)
        const isClickable = onSessionEdit && status !== 'past'

        return (
          <div
            key={session.id}
            className={`rounded-lg bg-white p-4 shadow ${
              isClickable ? 'cursor-pointer transition-shadow hover:shadow-md' : ''
            }`}
            onClick={isClickable ? () => onSessionEdit(session) : undefined}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`text-xs inline-flex items-center rounded-full border px-2 py-1 font-medium ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(session.startTime)}</span>
                  <span className="text-sm text-gray-500">
                    {formatTime(session.startTime)} (
                    {Math.round((session.endTime - session.startTime) / (1000 * 60))} Min)
                  </span>
                </div>

                <h3 className="mb-1 line-clamp-2 text-lg font-semibold text-gray-900">
                  {session.title}
                </h3>

                {session.presenter && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="truncate">{session.presenter}</span>
                  </div>
                )}
              </div>

              {isClickable && (
                <div className="ml-2 flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MobileScheduleList
