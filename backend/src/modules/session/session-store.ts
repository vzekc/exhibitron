import { EntityManager } from '@mikro-orm/core'
import { Session } from './session.entity.js'
import * as fastifySession from '@fastify/session'
import { FastifySessionObject } from '@fastify/session'

export class SessionStore implements fastifySession.SessionStore {
  private em: EntityManager

  constructor(em: EntityManager) {
    this.em = em
  }

  async get(
    sid: string,
    callback: (
      err: Error | null,
      session?: FastifySessionObject | null,
    ) => void,
  ) {
    try {
      const session = await this.em.findOne(Session, { sid })
      if (session) {
        callback(null, session.sess)
      } else {
        callback(null, null)
      }
    } catch (err) {
      callback(err as Error)
    }
  }

  async set(
    sid: string,
    sess: FastifySessionObject,
    callback?: (err?: Error) => void,
  ) {
    try {
      let session = await this.em.findOne(Session, { sid })
      const expire = sess.cookie.expires
        ? new Date(sess.cookie.expires)
        : new Date(Date.now() + 86400000) // Default to 1 day if not set
      if (session) {
        session.sess = sess
        session.expire = expire
      } else {
        session = this.em.create(Session, {
          sid,
          sess,
          expire,
        })
      }
      await this.em.persistAndFlush(session)
      callback?.()
    } catch (err) {
      callback?.(err as Error)
    }
  }

  async destroy(sid: string, callback?: (err?: Error) => void) {
    try {
      const session = await this.em.findOne(Session, { sid })
      if (session) {
        await this.em.removeAndFlush(session)
      }
      callback?.()
    } catch (err) {
      callback?.(err as Error)
    }
  }
}
