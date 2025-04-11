import { Context } from '../../app/context.js'
import { HostInput, MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { Host } from './entity.js'
import { UniqueConstraintViolationException, wrap } from '@mikro-orm/core'
import { HostService } from './service.js'
import { UniqueConstraintError, PermissionDeniedError } from '../common/errors.js'

function validateHostInput(input: HostInput, user: Context['user']) {
  if ((input.ipAddress || input.exhibitorId) && !user?.isAdministrator) {
    throw new PermissionDeniedError('Only administrators can set IP address or exhibitor')
  }
}

export const hostQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getHost: async (_parent, { name }, { db }) => db.host.findOneOrFail({ name }),
  // @ts-expect-error ts2345
  getHosts: async (_parent, _args, { db, exhibition }) => db.host.find({ exhibition }),
}

export const hostMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  addHost: async (_parent, { name, input }, { db, user, exhibition, exhibitor }) => {
    try {
      validateHostInput(input, user)

      const hostService = new HostService()
      const host = db.em.create(Host, {
        name,
        exhibition,
        exhibitor: input.exhibitorId
          ? await db.exhibitor.findOneOrFail({ id: input.exhibitorId })
          : exhibitor,
        ipAddress: input.ipAddress || (await hostService.allocateIpAddress()),
        services: input.services || [],
      })

      if (input.exhibitId) {
        host.exhibit = await db.exhibit.findOneOrFail({ id: input.exhibitId })
      }

      await db.em.persist(host).flush()
      return host
    } catch (error) {
      // Rollback any changes made to the database
      db.em.clear()

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
  updateHost: async (_parent, { name, input }, { db, user }) => {
    const host = await db.host.findOneOrFail({ name })
    validateHostInput(input, user)

    const { exhibitId, ...rest } = input
    wrap(host).assign(rest)

    if (exhibitId) {
      host.exhibit = await db.exhibit.findOneOrFail({ id: exhibitId })
    }

    await db.em.flush()
    return host
  },

  deleteHost: async (_parent: unknown, { name }: { name: string }, { db }: Context) => {
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
