import { Context } from '../../app/context.js'
import { ExhibitionResolvers, MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { QueryOrder } from '@mikro-orm/core'
import { Exhibit } from '../exhibit/entity.js'
import { Exhibition } from './entity.js'
import { sendEmail } from '../common/sendEmail.js'
import { htmlToText } from '../common/emailUtils.js'

export const exhibitionQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getExhibition: async (_, { id }, { db }) =>
    db.exhibition.findOneOrFail({ id }, { populate: ['exhibits', 'exhibitors', 'tables'] }),
  // @ts-expect-error ts2345
  getCurrentExhibition: async (_, _args, { exhibition }) => exhibition,
  // @ts-expect-error ts2345
  getExhibitions: async (_, _args, { db }) => db.exhibition.findAll(),
}

export const exhibitionMutations: MutationResolvers<Context> = {
  emailExhibitors: async (_, { exhibitorIds, subject, html }, { db, exhibition, user }) => {
    const loadedExhibition = await db.exhibition.findOneOrFail(
      { id: exhibition.id },
      { populate: ['exhibitors.user'] }, // populate exhibitors and their user
    )
    const exhibitors = loadedExhibition.exhibitors.getItems()
    if (exhibitors.length === 0) {
      throw new Error(`No exhibitors found for exhibition`)
    }
    const emailAddresses = exhibitors
      .filter(({ id }) => !exhibitorIds.length || exhibitorIds.includes(id))
      .map((exhibitor) => exhibitor.user.email)
      .filter(Boolean)
    if (emailAddresses.length === 0) {
      throw new Error(`No valid emails found for exhibitors in exhibition`)
    }
    let bcc: string[] | undefined = [user!.email]
    for (const emailAddress of emailAddresses) {
      await sendEmail({
        to: [emailAddress],
        subject,
        bcc,
        body: {
          html,
          text: htmlToText(html),
        },
      })
      bcc = undefined // clear BCC after first email to avoid sending to all in subsequent emails
    }
    return true
  },
}

export const exhibitionTypeResolvers: ExhibitionResolvers = {
  exhibitors: async (exhibition, _, { db }) => db.exhibitor.find({ exhibition }),
  exhibits: async (exhibition, _, { db }) =>
    db.exhibit
      .find({ exhibition }, { orderBy: { title: QueryOrder.ASC } })
      .then((exhibits: Exhibit[]) =>
        exhibits.sort((a: Exhibit, b: Exhibit) =>
          a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
        ),
      ),
  tables: async (exhibition, _, { db }) => db.table.find({ exhibition }),
  pages: async (exhibition, _, { db }) => db.page.find({ exhibition }),
  hosts: async (exhibition, _, { db }) => db.host.find({ exhibition }),
  isClientInLan: (_1, _2, { isClientInLan }) => isClientInLan,
  hasSeatplan: (exhibition) => !!(exhibition as unknown as Exhibition).seatplanSvg,
}

export const exhibitionResolvers = {
  Query: exhibitionQueries,
  Mutation: exhibitionMutations,
  Exhibition: exhibitionTypeResolvers,
}
