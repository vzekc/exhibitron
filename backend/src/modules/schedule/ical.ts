export interface Session {
  id: string
  title: string
  startTime: Date
  endTime: Date
  room: string
  presenters: string[]
}

export function generateICalContent(
  sessions: Session[],
  exhibitionName: string,
  exhibitionKey: string,
  baseUrl: string,
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
    const sessionUrl = `${baseUrl}/session/${session.id}`
    const summary = `[${exhibitionKey}] ${session.title}`

    icalContent.push(
      'BEGIN:VEVENT',
      `UID:${session.id}@${exhibitionKey}`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${session.presenters.join(', ')}`,
      `LOCATION:${session.room}`,
      `URL:${sessionUrl}`,
      'END:VEVENT',
    )
  })

  icalContent.push('END:VCALENDAR')
  return icalContent.join('\r\n')
}
