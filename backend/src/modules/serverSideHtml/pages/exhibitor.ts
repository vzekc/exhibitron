import { GeneratePageHtmlContext, makeExhibitLink } from '../utils.js'
import { ensureTransformedImage } from '../../image/transformation.js'
import { sendEmail } from '../../common/sendEmail.js'
import { makeVisitorContactEmail } from '../../registration/emails.js'
import { Exhibit } from '../../exhibit/entity.js'

const compareExhibits = (a: Exhibit, b: Exhibit) => {
  const nameA = a.title.toLowerCase()
  const nameB = b.title.toLowerCase()

  return nameA.localeCompare(nameB)
}

export const exhibitorHtml = async (
  { db, exhibition, request }: GeneratePageHtmlContext,
  id?: number,
) => {
  if (!id) {
    throw new Error('ID parameter is required for exhibitor page')
  }
  const exhibitor = await db.exhibitor.findOneOrFail(
    { id },
    { populate: ['user', 'exhibits', 'tables', 'user.profileImage', 'user.profileImage.image'] },
  )

  const makeEmailContactElements = async () => {
    if (request.method === 'POST') {
      const { message } = request.body as { message: string }
      await sendEmail(
        makeVisitorContactEmail(
          user.email,
          `Nachricht von einem Besucher der ${exhibition.title}`,
          message,
        ),
      )
      return '<hr/><p>Vielen Dank für Deine Nachricht!</p>'
    } else {
      return `<hr/>
        <form method="POST">
          <p>
            <label for="message">Direktkontakt (Kontaktinformation für Rückantwort nicht vergessen!):</label>
          </p>
          <p>
            <textarea id="message" name="message" rows="10" cols="50"></textarea>
          </p>
          <button type="submit">Absenden</button>
        </form>`
    }
  }

  const { user, tables, exhibits } = exhibitor
  let profileImageHtml = ''
  if (user.profileImage) {
    const dimensions = await ensureTransformedImage(db.em, user.profileImage.image.id, 'htmlSmall')
    profileImageHtml = `<img src="/api/images/${user.profileImage.image.slug}/htmlSmall" width="${dimensions.width}" height="${dimensions.height}" alt="${user.fullName}" />`
  }
  return `<div>
    <h2>${user.fullName}${user.nickname ? ' (' + user.nickname + ')' : ''}</h2>
    ${exhibitor.topic ? '<p>' + exhibitor.topic + '</p>' : ''}
    ${profileImageHtml}
    ${user.bio ? '<p>' + user.bio + '</p>' : ''}
    ${tables.length ? '<p>Tische: ' + tables.map((table) => table.number).join(', ') + '</p>' : ''}
    ${exhibits.length ? '<p>Exponate:<p><ul><li>' + [...exhibits].sort(compareExhibits).map(makeExhibitLink).join('</li><li>') + '</li></ul>' : ''}
    ${user.allowEmailContact ? await makeEmailContactElements() : ''}
  </div>`
}
