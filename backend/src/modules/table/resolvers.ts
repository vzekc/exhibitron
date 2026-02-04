import { Context } from '../../app/context.js'
import { MutationResolvers, QueryResolvers, TableResolvers } from '../../generated/graphql.js'
import { AuthError, PermissionDeniedError } from '../common/errors.js'
import { logger } from '../../app/logger.js'
import { requireNotFrozen } from '../../db.js'

export const tableQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getTable: async (_, { number }, { db }) => db.table.findOneOrFail({ number }),
  // @ts-expect-error ts2345
  getTables: async (_, _args, { db }) => db.table.findAll(),
}

export const tableMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  claimTable: async (_, { number }, { db, exhibition, exhibitor }) => {
    requireNotFrozen(exhibition)
    if (!exhibitor) {
      throw new AuthError('You must be logged in to claim a table')
    }
    await db.em.populate(exhibitor, ['tables'])
    logger.debug(
      `try to claim table ${number}, already claimed: ${exhibitor.tables.map((table) => table.number).join(' ')}`,
    )
    if (
      exhibitor.tables.length >= 2 &&
      !exhibitor.tables.find((table) => table.number === number)
    ) {
      throw new PermissionDeniedError('You can claim at most two tables')
    }
    return await db.table.claim(exhibition, number, exhibitor)
  },
  // @ts-expect-error ts2345
  releaseTable: async (_, { number }, { db, exhibition, exhibitor, user }) => {
    requireNotFrozen(exhibition)
    // Find all exhibits associated with this table
    const table = await db.table.findOneOrFail({ exhibition, number })
    const exhibits = await db.exhibit.find({ table })

    // Unassign all exhibits from the table
    for (const exhibit of exhibits) {
      exhibit.table = undefined
    }
    await db.em.flush()

    // Now release the table
    return await db.table.release(exhibition, number, user?.isAdministrator ? null : exhibitor)
  },
  // @ts-expect-error ts2345
  assignTable: async (_, { number, exhibitorId }, { db, exhibition }) => {
    requireNotFrozen(exhibition)
    const exhibitor = await db.exhibitor.findOneOrFail({ id: exhibitorId })
    const table = await db.table.findOneOrFail({ exhibition, number })
    table.exhibitor = exhibitor
    return table
  },
}

export const tableTypeResolvers: TableResolvers = {
  exhibitor: async (table, _, { db }) =>
    table.exhibitor ? db.exhibitor.findOneOrFail({ id: table.exhibitor.id }) : null,
  exhibits: async (table, _, { db }) => db.exhibit.find({ table: table }),
}

export const tableResolvers = {
  Query: tableQueries,
  Mutation: tableMutations,
  Table: tableTypeResolvers,
}
