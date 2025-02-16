import { initORM } from '../db.js'
import { RequestContext } from '@mikro-orm/core'
import { FastifyInstance } from 'fastify'

export const register = async (app: FastifyInstance, migrate: boolean) => {
  const db = await initORM()

  if (migrate) {
    // sync the schema
    await db.orm.migrator.up()
  }

  app.addHook('onRequest', (_request, _reply, done) => {
    RequestContext.create(db.em, done)
  })

  // shut down the connection when closing the app
  app.addHook('onClose', async () => {
    await db.orm.close()
  })
}
