import { GeneratePageHtmlContext } from '../utils.js'
import { makeExhibitorLink } from '../utils.js'
import { makeExhibitLink } from '../utils.js'

export const lanHtml = async (context: GeneratePageHtmlContext): Promise<string> => {
  const { db, exhibition } = context

  // Get all hosts for the current exhibition
  const hosts = await db.host.find(
    { exhibition: exhibition.id },
    {
      populate: ['exhibitor.user', 'exhibit'],
      orderBy: { name: 'ASC' },
    },
  )

  const getBrowserProtocol = (services: string[] | null | undefined) => {
    if (!services) return null
    return services.some((service) => service.toLowerCase() === 'https')
      ? 'https'
      : services.some((service) => service.toLowerCase() === 'http')
        ? 'http'
        : null
  }

  const hostRows = hosts
    .map((host) => {
      const protocol = getBrowserProtocol(host.services)
      const nameCell =
        protocol && exhibition.dnsZone
          ? `<a href="${protocol}://${host.name}.${exhibition.dnsZone}" target="_blank">${host.name}</a>`
          : host.name

      const exhibitorCell = host.exhibitor ? makeExhibitorLink(host.exhibitor) : ''

      const exhibitCell = host.exhibit ? makeExhibitLink(host.exhibit) : ''

      const servicesCell = host.services
        ? host.services
            .map(
              (service) =>
                `<span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; margin-right: 4px;">${service}</span>`,
            )
            .join('')
        : ''

      return `
      <tr>
        <td>${nameCell}</td>
        <td>${host.ipAddress}</td>
        <td>${exhibitorCell}</td>
        <td>${exhibitCell}</td>
        <td>${servicesCell}</td>
      </tr>
    `
    })
    .join('')

  return `
    <div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
      <h2>LAN-Übersicht</h2>
      <p>
        Hier findest Du eine Übersicht aller Hostnamen, die im Konferenz-LAN registriert wurden.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Name</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">IP-Adresse</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Aussteller</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Exponat</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Dienste</th>
          </tr>
        </thead>
        <tbody>
          ${hostRows}
        </tbody>
      </table>
    </div>
  `
}
