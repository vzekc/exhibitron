import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import websocket from '@fastify/websocket'
import { randomUUID } from 'crypto'
import { initORM } from '../../db.js'
import { createContext } from '../../app/context.js'
import { SerialToken } from './entity.js'
import type { Socket } from './relay.js'
import {
  findAgent,
  forgetEverything,
  joinSession,
  listAgents,
  registerAgent,
  requestSession,
  say,
  sessionsFor,
  unregisterAgent,
  SESSIONS_PER_EXHIBITOR,
} from './relay.js'
import { bearerOf, hash, MAX_LABEL_LENGTH, MAX_TOKENS_PER_EXHIBITOR, mint } from './tokens.js'

/*
 * The serial login, from this end.
 *
 * An exhibitor's machine sits on a null modem at home; the login it talks to
 * is on travelstar, in a hall this server cannot reach. The agent there dials
 * out and holds a socket open, and these routes join one to the other.
 *
 * Every database read happens while this is still an HTTP request. MikroORM's
 * request context ends when the handler returns, and a websocket outlives its
 * handler by hours — so authorisation is settled up front and the socket
 * itself touches nothing.
 */

/* What travelstar's agent is allowed to say, and nobody else. Read when a
   connection arrives, so the environment may be set up after this loads. */
const agentToken = () => process.env.SERIAL_AGENT_TOKEN ?? ''

const DEFAULT_TERM = 'vt100'
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24

type SessionQuery = {
  agent?: string
  mode?: string
  term?: string
  cols?: string
  rows?: string
}

/*
 * What the port is: somewhere to log in, or the Kermit protocol on its own for
 * a machine whose terminal program is all it has. At the show this belongs to
 * the port and is settled at the terminal server; here the client names it,
 * because there is no terminal server to name it for them.
 */
const MODES = ['login', 'kermit']
const DEFAULT_MODE = 'login'

/*
 * A websocket is answered by closing it, not by a status code.
 *
 * @fastify/websocket completes the upgrade before a route hook's reply can
 * stop it, so everything this end has to say about a connection it will not
 * serve is said on the socket itself: the reason first, so a client can print
 * it, and then a close.
 */
const UNAUTHORISED = 4401
const UNAVAILABLE = 4503

function deny(socket: Socket, code: number, reason: string) {
  /*
   * A paused socket cannot read the client's half of the closing handshake,
   * and the close then waits out the full timeout instead of happening. Let it
   * flow again first; there is nothing left to lose by reading.
   */
  socket.resume()
  say(socket, { t: 'exit', reason })
  socket.close(code, reason)
}

function agentAuthorised(request: FastifyRequest) {
  const expected = agentToken()
  return expected.length > 0 && bearerOf(request.headers.authorization) === expected
}

function positive(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function registerSerialRoutes(app: FastifyInstance) {
  const db = await initORM()
  await app.register(websocket)

  /*
   * The agent's control socket. It registers under a name and is then asked
   * for sessions over the same socket for as long as it stays connected.
   */
  app.get('/api/serial/agent', { websocket: true }, (connection, request) => {
    const socket = connection.socket
    if (!agentAuthorised(request)) {
      deny(socket, UNAUTHORISED, 'not an agent')
      return
    }
    let registered: ReturnType<typeof findAgent> = null

    socket.on('message', (raw: Buffer, isBinary: boolean) => {
      if (isBinary) return
      const message = JSON.parse(raw.toString()) as Record<string, unknown>
      if (message.t !== 'hello' || typeof message.name !== 'string') return

      registered = {
        name: message.name,
        socket,
        protocol: typeof message.protocol === 'number' ? message.protocol : 0,
        maxSessions: typeof message.maxSessions === 'number' ? message.maxSessions : 1,
        sessions: 0,
      }
      registerAgent(registered)
      app.log.info(`serial: agent ${message.name} registered`)
    })

    socket.on('close', () => {
      if (registered) {
        unregisterAgent(registered)
        app.log.info(`serial: agent ${registered.name} went away`)
      }
    })
  })

  /*
   * The agent dialling back for a session somebody is waiting on. The id was
   * minted here and sent over the control socket, so an agent cannot conjure
   * a session that nobody asked for.
   */
  app.get<{ Querystring: { sid?: string } }>(
    '/api/serial/data',
    { websocket: true },
    (connection, request) => {
      if (!agentAuthorised(request)) {
        deny(connection.socket, UNAUTHORISED, 'not an agent')
        return
      }
      const sid = request.query.sid ?? ''
      if (!sid || !joinSession(sid, connection.socket)) {
        connection.socket.close(1008, 'no session is waiting for that id')
      }
    },
  )

  /*
   * Who is at the other end: the command-line client by its token, the browser
   * page by the session it is already inside. The database is read here, while
   * this is still a request and MikroORM's context is still around it.
   */
  async function exhibitorFor(request: FastifyRequest): Promise<number | null> {
    const bearer = bearerOf(request.headers.authorization)

    if (bearer) {
      const token = await db.em.findOne(
        SerialToken,
        { tokenHash: hash(bearer), revokedAt: null },
        { populate: ['exhibitor'] },
      )
      if (!token || token.expiresAt.getTime() < Date.now()) return null
      token.lastUsedAt = new Date()
      await db.em.flush()
      return token.exhibitor.id
    }

    /*
     * createContext maps the host to an exhibition and throws when none
     * matches. On a websocket that would be an unhandled rejection rather than
     * a status code, and a host this server does not serve has no exhibitor on
     * it either — which is the answer the caller wants.
     */
    const context = await createContext(request).catch(() => null)
    return context?.exhibitor?.id ?? null
  }

  app.get<{ Querystring: SessionQuery }>(
    '/api/serial/session',
    { websocket: true },
    async (connection, request) => {
      const socket = connection.socket

      /*
       * A client's first words are about its wire and arrive at once. Nothing
       * is listening until the session is asked for, so hold the socket until
       * it is.
       */
      socket.pause()

      /*
       * This handler owns the socket, so it owns anything thrown inside it: a
       * rejected promise here takes the connection down without a close frame,
       * and the client is left with a connection that vanished and no reason
       * for it. Every failure leaves by the same door as a refusal.
       */
      try {
        const exhibitorId = await exhibitorFor(request)
        if (exhibitorId === null) {
          deny(socket, UNAUTHORISED, 'log in as an exhibitor, or give a token that is still good')
          return
        }

        const agent = findAgent(request.query.agent)
        if (!agent) {
          deny(
            socket,
            UNAVAILABLE,
            request.query.agent
              ? `no agent named ${request.query.agent} is connected`
              : 'no agent is connected',
          )
          return
        }
        if (agent.sessions >= agent.maxSessions) {
          deny(socket, UNAVAILABLE, `${agent.name} is full`)
          return
        }
        if (sessionsFor(exhibitorId) >= SESSIONS_PER_EXHIBITOR) {
          deny(socket, UNAVAILABLE, 'you already have as many sessions open as this allows')
          return
        }

        requestSession({
          sid: randomUUID(),
          agent,
          client: socket,
          exhibitorId,
          mode: MODES.includes(request.query.mode ?? '') ? request.query.mode! : DEFAULT_MODE,
          term: request.query.term || DEFAULT_TERM,
          cols: positive(request.query.cols, DEFAULT_COLS),
          rows: positive(request.query.rows, DEFAULT_ROWS),
        })

        socket.resume()
      } catch (error) {
        app.log.error({ err: error }, 'serial: the session could not be opened')
        deny(socket, UNAVAILABLE, 'the relay could not open the session')
      }
    },
  )

  /* Which agents an exhibitor can pick from, for the control on the page. */
  app.get('/api/serial/agents', async (request, reply) => {
    const context = await createContext(request)
    if (!context.exhibitor) {
      return reply.code(401).send({ error: 'log in as an exhibitor first' })
    }
    return reply.send({ agents: listAgents() })
  })

  /*
   * Whose tokens these are. The refusal is left to the caller so that it can
   * return the reply: a handler that sends and then resolves to undefined
   * leaves fastify to send a second time, which it cannot.
   */
  async function exhibitorOf(request: FastifyRequest) {
    const context = await createContext(request)
    return context.exhibitor
  }

  const notLoggedIn = (reply: FastifyReply) =>
    reply.code(401).send({ error: 'log in as an exhibitor first' })

  app.get('/api/serial/tokens', async (request, reply) => {
    const exhibitor = await exhibitorOf(request)
    if (!exhibitor) return notLoggedIn(reply)

    const tokens = await db.em.find(
      SerialToken,
      { exhibitor, revokedAt: null },
      { orderBy: { createdAt: 'desc' } },
    )
    return reply.send({
      tokens: tokens.map((token) => ({
        id: token.id,
        prefix: token.prefix,
        label: token.label,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt ?? null,
        expired: token.expiresAt.getTime() < Date.now(),
      })),
    })
  })

  /* The one time the token itself exists outside the client's own config. */
  app.post<{ Body: { label?: string } }>('/api/serial/tokens', async (request, reply) => {
    const exhibitor = await exhibitorOf(request)
    if (!exhibitor) return notLoggedIn(reply)

    const label = (request.body?.label ?? '').trim().slice(0, MAX_LABEL_LENGTH)
    if (!label) {
      return reply.code(400).send({ error: 'give the token a name you will recognise' })
    }

    const live = await db.em.count(SerialToken, { exhibitor, revokedAt: null })
    if (live >= MAX_TOKENS_PER_EXHIBITOR) {
      return reply.code(409).send({
        error: `you have ${MAX_TOKENS_PER_EXHIBITOR} tokens already; revoke one to make another`,
      })
    }

    const minted = mint()
    const row = db.em.create(SerialToken, {
      exhibitor,
      tokenHash: minted.tokenHash,
      prefix: minted.prefix,
      label,
      expiresAt: minted.expiresAt,
    })
    await db.em.persistAndFlush(row)

    return reply.send({
      id: row.id,
      token: minted.token,
      prefix: minted.prefix,
      label,
      expiresAt: minted.expiresAt,
    })
  })

  app.delete<{ Params: { id: string } }>('/api/serial/tokens/:id', async (request, reply) => {
    const exhibitor = await exhibitorOf(request)
    if (!exhibitor) return notLoggedIn(reply)

    const token = await db.em.findOne(SerialToken, {
      id: Number(request.params.id),
      exhibitor,
      revokedAt: null,
    })
    if (!token) return reply.code(404).send({ error: 'no such token' })

    token.revokedAt = new Date()
    await db.em.flush()
    return reply.code(204).send()
  })
}

export { forgetEverything as forgetSerialState }
