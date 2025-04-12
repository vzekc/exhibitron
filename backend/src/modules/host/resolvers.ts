import { Context } from '../../app/context.js'
import { MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { Host } from './entity.js'
import { UniqueConstraintViolationException, NotFoundError } from '@mikro-orm/core'
import { UniqueConstraintError, PermissionDeniedError } from '../common/errors.js'
import { pino } from 'pino'

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
})

export const hostQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getHost: async (_parent, { name }, { db }) => db.host.findOneOrFail({ name }),
  // @ts-expect-error ts2345
  getHosts: async (_parent, _args, { db, exhibition }) => db.host.find({ exhibition }),
}

export const hostMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  addHost: async (_parent, { name, input }, { db, user, exhibition, exhibitor }) => {
    logger.debug('Starting addHost mutation')
    if ((input.ipAddress || input.exhibitorId) && !user?.isAdministrator) {
      throw new PermissionDeniedError('Only administrators can set IP address or exhibitor')
    }

    logger.debug('Input validated')

    let hostExhibitor = exhibitor
    if (input.exhibitId) {
      logger.debug('Setting exhibit and exhibitor')
      const exhibit = await db.exhibit.findOneOrFail({ id: input.exhibitId })
      if (exhibit.exhibitor !== exhibitor && !user?.isAdministrator) {
        throw new PermissionDeniedError('Only the exhibitor of the exhibit can add a host')
      }

      hostExhibitor = exhibit.exhibitor
    }

    const host = db.em.create(Host, {
      name,
      exhibition,
      exhibitor: input.exhibitorId
        ? await db.exhibitor.findOneOrFail({ id: input.exhibitorId })
        : hostExhibitor,
      ipAddress: input.ipAddress ?? undefined,
      services: input.services || [],
    })
    logger.debug('Host entity created')

    if (input.exhibitId) {
      logger.debug('Setting exhibit')
      host.exhibit = await db.exhibit.findOneOrFail({ id: input.exhibitId })
    }

    logger.debug('Persisting host')
    try {
      await db.em.persist(host).flush()
      logger.debug('Host persisted successfully', host)
      // Reload the host to ensure all fields are properly populated
      return await db.host.findOneOrFail({ name })
    } catch (error) {
      logger.error({ error }, 'Error in addHost mutation')
      // Check if it's a unique constraint violation
      if (error instanceof UniqueConstraintViolationException) {
        if (error.message.includes('host_name_unique')) {
          throw new UniqueConstraintError(
            `A host with the name "${name}" already exists`,
            'name',
            name,
          )
        }
        if (error.message.includes('host_ip_address_unique')) {
          // Get the actual IP address that caused the conflict from the error message
          const ipMatch = error.message.match(/Key \(ip_address\)=\(([^)]+)\)/)
          const conflictingIp = ipMatch ? ipMatch[1] : 'unknown'
          throw new UniqueConstraintError(
            `A host with the IP address "${conflictingIp}" already exists`,
            'ipAddress',
            conflictingIp,
          )
        }
      }
      throw error
    }
  },

  // @ts-expect-error ts2322
  updateHostServices: async (_parent, { name, services }, { db, exhibitor, user }) => {
    logger.debug('Starting updateHostServices mutation')
    try {
      const host = await db.host.findOneOrFail({ name })

      if (!user?.isAdministrator && host.exhibitor?.id !== exhibitor?.id) {
        throw new PermissionDeniedError(
          'Only administrators or the host exhibitor can update host services',
        )
      }

      host.services = services

      await db.em.flush()
      return host
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError(`Host not found: ${name}`)
      }
      throw error
    }
  },

  deleteHost: async (_parent: unknown, { name }: { name: string }, { db }: Context) => {
    logger.debug('Starting deleteHost mutation')
    const host = await db.host.findOneOrFail({ name })
    db.em.remove(host)
    await db.em.flush()
    return true
  },
}

export const hostTypeResolvers = {
  exhibitor: async (host: Host, _parent: unknown, { db }: Context) =>
    host.exhibitor ? db.exhibitor.findOneOrFail({ id: host.exhibitor.id }) : null,
  exhibit: async (host: Host, _parent: unknown, { db }: Context) =>
    host.exhibit ? db.exhibit.findOneOrFail({ id: host.exhibit.id }) : null,
}

export const hostResolvers = {
  Query: hostQueries,
  Mutation: hostMutations,
  Host: hostTypeResolvers,
}
