import type { ApolloFastifyContextFunction } from '@as-integrations/fastify'
import { initORM } from '../db.js'
import memoize from 'memoizee'
import { Services } from '../db.js'
import { Exhibition } from '../modules/exhibition/exhibition.entity.js'
import { Exhibitor } from '../modules/exhibitor/exhibitor.entity.js'
import pino from 'pino'
import { CreateRequestContext } from '@mikro-orm/core'

// @ts-expect-error ts2349
const logger = pino()

export const getHostMatchers = memoize(async () => {
  const db = await initORM()

  const exhibitions = await db.exhibition.findAll({ disableIdentityMap: true })
  return new Map<RegExp, number>(
    exhibitions.map((exhibition) => [
      new RegExp(exhibition.hostMatch),
      exhibition.id,
    ]),
  )
})

type HostMatchers = Awaited<ReturnType<typeof getHostMatchers>>

const hostToExhibitionId = memoize(
  (hostMatchers: HostMatchers, host: string) => {
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
  },
)

export type Context = {
  db: Services
  exhibition: Exhibition
  exhibitor: Exhibitor | null
}

export const createContext: ApolloFastifyContextFunction<Context> = async (
  request,
) => {
  const db = await initORM()

  if (request.session.userId) {
    const user = await db.user.findOne({
      id: request.session.userId,
    })
    if (user) {
      request.user = user
      logger.debug(`User: ${request.user.email} set from session`)
    } else {
      logger.warn(
        `User with ID ${request.session.userId} not found, invalid session ignored`,
      )
    }
  }

  const exhibition = await db.exhibition.findOneOrFail({
    id: hostToExhibitionId(await getHostMatchers(), request.hostname),
  })
  const context = {
    db,
    exhibition,
    exhibitor:
      request.user &&
      (await db.exhibitor.findOne({
        exhibition: request.exhibition,
        user: request.user,
      })),
  }
  logger.debug('createContext', context)
  return context
}

export const destroyContext = async (context: Context) => {
  logger.debug('destroyContext', context)
  const { db } = context
  await db.em.flush()
}
