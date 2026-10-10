import { Context } from '../../app/context.js'
import { QueryResolvers } from '../../generated/graphql.js'
import { VisitorPhoto } from '../visitorPhoto/entity.js'
import { isWellFormedId, normalizePhotoId } from '../visitorPhoto/storage.js'
import { Document } from '../document/entity.js'

/*
 * One field for everything a visitor or exhibitor might type at the show.
 *
 * A query that names one thing outright leads straight to its page, tried in
 * this order: a photo ID from a trail slip, a table number, an exhibitor's
 * forum nickname. Anything else is looked for in the exhibits, the exhibitors
 * and the talks, and the matches are listed.
 */

const MIN_CONTENT_QUERY = 2
const MAX_RESULTS = 50

const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`

/* Rich text is stored as HTML; a match inside a tag or an entity is no match. */
const textOf = (document: Document | null | undefined) =>
  (document?.html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

const contains = (haystack: string | null | undefined, needle: string) =>
  !!haystack && haystack.toLowerCase().includes(needle.toLowerCase())

async function findTarget(query: string, { db, exhibition }: Context) {
  const photoId = normalizePhotoId(query)
  if (isWellFormedId(photoId) && (await db.em.findOne(VisitorPhoto, { id: photoId }))) {
    return `/foto/${photoId}`
  }

  if (/^\d+$/.test(query)) {
    const table = await db.table.findOne({ exhibition, number: Number(query) })
    if (table) return `/table/${table.number}`
  }

  const exhibitor = await db.exhibitor.findOne({
    exhibition,
    user: { nickname: { $ilike: query.replace(/[\\%_]/g, '\\$&') } },
  })
  if (exhibitor) return `/exhibitor/${exhibitor.id}`

  return null
}

async function findContent(query: string, { db, exhibition }: Context) {
  const pattern = likePattern(query)

  const exhibits = (
    await db.exhibit.find(
      {
        exhibition,
        $or: [
          { title: { $ilike: pattern } },
          { description: { html: { $ilike: pattern } } },
          { descriptionExtension: { html: { $ilike: pattern } } },
        ],
      },
      { orderBy: { title: 'asc' } },
    )
  ).filter(
    (exhibit) =>
      contains(exhibit.title, query) ||
      contains(textOf(exhibit.description), query) ||
      contains(textOf(exhibit.descriptionExtension), query),
  )

  const exhibitors = await db.exhibitor.find(
    {
      exhibition,
      $or: [
        { topic: { $ilike: pattern } },
        { user: { nickname: { $ilike: pattern } } },
        { user: { fullName: { $ilike: pattern } } },
      ],
    },
    { populate: ['user'], orderBy: { user: { fullName: 'asc' } } },
  )

  const conferenceSessions = (
    await db.conferenceSession.find(
      {
        exhibition,
        $or: [{ title: { $ilike: pattern } }, { description: { html: { $ilike: pattern } } }],
      },
      { populate: ['description'], orderBy: { startTime: 'asc' } },
    )
  ).filter(
    (session) => contains(session.title, query) || contains(textOf(session.description), query),
  )

  return {
    exhibits: exhibits.slice(0, MAX_RESULTS),
    exhibitors: exhibitors.slice(0, MAX_RESULTS),
    conferenceSessions: conferenceSessions.slice(0, MAX_RESULTS),
  }
}

export const searchQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  search: async (_, { query }, context) => {
    const text = query.trim()
    const nothing = { target: null, exhibits: [], exhibitors: [], conferenceSessions: [] }
    if (!text) return nothing

    const target = await findTarget(text, context)
    if (target) return { ...nothing, target }

    if (text.length < MIN_CONTENT_QUERY) return nothing
    return { target: null, ...(await findContent(text, context)) }
  },
}

export const searchResolvers = {
  Query: searchQueries,
}
