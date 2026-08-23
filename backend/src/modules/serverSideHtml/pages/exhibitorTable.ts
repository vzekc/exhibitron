import { GeneratePageHtmlContext } from '../utils.js'

// Escape to plain ASCII so the table reads the same whatever charset the
// embedding page assumes, and so a free-text topic cannot bring markup with it.
const escapeHtml = (text: string) =>
  text.replace(/[&<>"]|[^\x20-\x7E]/gu, (character) => `&#${character.codePointAt(0)};`)

export const exhibitorTableHtml = async ({ db, exhibition }: GeneratePageHtmlContext) => {
  const exhibitors = await db.exhibitor.findAll({
    where: { exhibition },
    populate: ['user', 'tables'],
  })

  // What somebody said they would bring when they registered, for the exhibitors
  // who have not written a topic of their own.
  const registrations = await db.registration.findAll({ where: { exhibition } })
  const registeredTopics = new Map(
    registrations.map((registration) => [
      registration.email.toLowerCase(),
      registration.topic.replace(/^Etwas anderes \((.*)\)$/, '$1'),
    ]),
  )

  const nicknameOf = (exhibitor: (typeof exhibitors)[number]) =>
    exhibitor.user.nickname || exhibitor.user.fullName

  const rows = exhibitors
    .filter((exhibitor) => exhibitor.tables.length)
    .sort((a, b) => nicknameOf(a).localeCompare(nicknameOf(b), undefined, { sensitivity: 'base' }))
    .map((exhibitor) => {
      const topic =
        exhibitor.topic || registeredTopics.get(exhibitor.user.email.toLowerCase()) || ''
      const tables = exhibitor.tables
        .map((table) => table.number)
        .sort((a, b) => a - b)
        .join(', ')
      return `<tr><td>${escapeHtml(nicknameOf(exhibitor))}</td><td>${escapeHtml(topic)}</td><td>${tables}</td></tr>`
    })
    .join('\n')

  return `<table border="1">
<tr><th>Nickname</th><th>Ausstellung</th><th>Tisch Nr.</th></tr>
${rows}
</table>
`
}
