import 'dotenv/config'
import { FastifyInstance } from 'fastify'
import { initORM } from '../db.js'
import memoize from 'memoizee'

export const register = async (app: FastifyInstance) => {
  const db = await initORM()

  const exhibitions = await db.exhibition.findAll({ disableIdentityMap: true })
  const hostMatchers = new Map<RegExp, number>(
    exhibitions.map((exhibition) => [
      new RegExp(exhibition.hostMatch),
      exhibition.id,
    ]),
  )

  const hostToExhibitionId = memoize((host: string) => {
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

  // register hook after the ORM one to use the context
  app.addHook('onRequest', async (request) => {
    request.exhibition = await db.exhibition.findOneOrFail({
      id: hostToExhibitionId(request.hostname),
    })
    if (request.user) {
      request.exhibitor =
        (await db.exhibitor.findOne({
          exhibition: request.exhibition,
          user: request.user,
        })) || undefined
    }
  })
}
