import { GeneratePageHtmlContext } from '../utils.js'

export const scheduleHtml = async (context: GeneratePageHtmlContext): Promise<string> => {
  const { db, exhibition } = context

  // Get all conference sessions for the current exhibition
  const sessions = await db.conferenceSession.find(
    { exhibition: exhibition.id },
    {
      populate: ['room', 'exhibitors.user'],
      orderBy: { startTime: 'ASC' },
    },
  )

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const sessionItems = sessions
    .map((session) => {
      if (!session.startTime || !session.endTime) return ''

      const startTime = new Date(session.startTime)
      const endTime = new Date(session.endTime)
      const presenter = session.exhibitors?.[0]?.user.fullName ?? ''

      return `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-weight: bold; margin-bottom: 5px;">
          ${session.title}
        </div>
        <div style="color: #4b5563; margin-bottom: 5px;">
          ${formatDate(startTime)}, ${formatTime(startTime)} - ${formatTime(endTime)}
        </div>
        <div style="color: #4b5563; margin-bottom: 5px;">
          Raum: ${session.room?.name ?? 'Nicht zugewiesen'}
        </div>
        ${presenter ? `<div style="color: #4b5563;">Präsentiert von: ${presenter}</div>` : ''}
      </div>
    `
    })
    .join('')

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2>Zeitplan</h2>
      <p style="margin-bottom: 20px;">
        Hier findest Du eine Übersicht aller Veranstaltungen, geordnet nach Startzeit.
      </p>
      <div>
        ${sessionItems}
      </div>
    </div>
  `
}
