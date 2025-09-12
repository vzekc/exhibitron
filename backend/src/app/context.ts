import { initORM } from '../db.js'
import memoize from 'memoizee'
import { Services } from '../db.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'
import { createRequestLogger } from './logger.js'
import { User } from '../modules/user/entity.js'
import { FastifySessionObject } from '@fastify/session'
import { FastifyRequest } from 'fastify'
import { isRequestFromLan } from '../misc/isRequestFromLan.js'

export const getHostMatchers = memoize(async () => {
  const db = await initORM()

  const exhibitions = await db.exhibition.findAll({ disableIdentityMap: true })
  return new Map<RegExp, number>(
    exhibitions.map((exhibition) => [new RegExp(exhibition.hostMatch), exhibition.id]),
  )
})

type HostMatchers = Awaited<ReturnType<typeof getHostMatchers>>

const hostToExhibitionId = memoize((hostMatchers: HostMatchers, host: string) => {
  const ids: number[] = []
  for (const [matcher, id] of hostMatchers) {
    if (matcher.test(host)) {
      ids.push(id)
    }
  }
  if (ids.length === 1) {
    return ids[0]
  } else if (ids.length > 1) {
    throw new Error(`multiple exhibitions match ${host}`)
  } else {
    throw new Error(`cannot map ${host} to an exhibition, no match`)
  }
})

export type Context = {
  db: Services
  user: User | null
  session: FastifySessionObject
  exhibition: Exhibition
  exhibitor: Exhibitor | null
  canSwitchExhibitor: boolean
}

export const createContext = async (request: FastifyRequest) => {
  const db = await initORM()
  const logger = createRequestLogger(request.requestId)

  if (request.session.userId) {
    const user = await db.user.findOne({
      id: request.session.userId,
    })
    if (user) {
      request.user = user
      logger.debug(`User: ${request.user.email} set from session`)
    } else {
      logger.warn(`User with ID ${request.session.userId} not found, invalid session ignored`)
    }
  }

  const exhibition = await db.exhibition.findOneOrFail({
    id: hostToExhibitionId(await getHostMatchers(), request.hostname),
  })

  const isClientInLan = isRequestFromLan(request)

  const exhibitor =
    request.user &&
    (await db.exhibitor.findOne({
      exhibition: exhibition,
      user: request.user,
    }))
  const context = {
    db,
    session: request.session,
    user: request.user,
    exhibition,
    exhibitor,
    canSwitchExhibitor: !!request.session.canSwitchExhibitor,
    isClientInLan,
  }
  logger.debug('createContext', context)
  return context
}

export const destroyContext = async (context: Context, requestId: string) => {
  const logger = createRequestLogger(requestId)
  logger.debug('destroyContext', context)
  // No need to flush here as it's handled by the transaction
}
