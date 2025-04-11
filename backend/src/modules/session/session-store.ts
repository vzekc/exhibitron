import { MikroORM } from '@mikro-orm/core'
import { Session } from './entity.js'
import * as fastifySession from '@fastify/session'
import { FastifySessionObject } from '@fastify/session'
import config from '../../mikro-orm.config.js'

export class SessionStore implements fastifySession.SessionStore {
  private orm: MikroORM

  constructor(orm: MikroORM) {
    this.orm = orm
  }

  async get(
    sid: string,
    callback: (err: Error | null, session?: FastifySessionObject | null) => void,
  ) {
    const em = this.orm.em.fork()
    try {
      const session = await em.findOne(Session, { sid })
      if (session) {
        callback(null, session.sess)
      } else {
        callback(null, null)
      }
    } catch (err) {
      callback(err as Error)
    }
  }

  async set(sid: string, sess: FastifySessionObject, callback?: (err?: Error) => void) {
    const em = this.orm.em.fork()
    try {
      let session = await em.findOne(Session, { sid })
      const expire = sess.cookie.expires
        ? new Date(sess.cookie.expires)
        : new Date(Date.now() + 86400000) // Default to 1 day if not set
      if (session) {
        session.sess = sess
        session.expire = expire
      } else {
        session = em.create(Session, {
          sid,
          sess,
          expire,
        })
      }
      await em.persistAndFlush(session)
      callback?.()
    } catch (err) {
      callback?.(err as Error)
    }
  }

  async destroy(sid: string, callback?: (err?: Error) => void) {
    const em = this.orm.em.fork()
    try {
      const session = await em.findOne(Session, { sid })
      if (session) {
        await em.removeAndFlush(session)
      }
      callback?.()
    } catch (err) {
      callback?.(err as Error)
    }
  }
}

// Create a separate ORM instance for session management
let sessionORM: MikroORM

export async function createSessionStore() {
  if (!sessionORM) {
    sessionORM = await MikroORM.init({
      ...config,
      // Use a different connection name to avoid conflicts
      name: 'session',
    })
  }
  return new SessionStore(sessionORM)
}
