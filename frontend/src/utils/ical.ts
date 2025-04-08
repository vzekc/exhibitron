import type { Session } from '@components/schedule/types'

export function generateICalContent(
  sessions: Session[],
  exhibitionName: string,
  exhibitionKey: string,
): string {
  const now = new Date()
  const icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Exhibitron//Schedule//EN',
    `X-WR-CALNAME:${exhibitionName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  sessions.forEach((session) => {
    const startDate = new Date(session.startTime)
    const endDate = new Date(session.endTime)
    const sessionUrl = `${window.location.origin}/session/${session.id}`
    const description = [
      session.presenter ? `Mit: ${session.presenter}` : '',
      `Raum: ${session.roomId}`,
    ]
      .filter(Boolean)
      .join('\\n')

    const summary = `[${exhibitionKey}] ${session.title}`

    icalContent.push(
      'BEGIN:VEVENT',
      `UID:${session.id}@${exhibitionKey}`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `URL:${sessionUrl}`,
      'END:VEVENT',
    )
  })

  icalContent.push('END:VCALENDAR')
  return icalContent.join('\r\n')
}

export function downloadICalFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
