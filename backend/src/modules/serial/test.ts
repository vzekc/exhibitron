import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { WebSocket } from 'ws'
import { FastifyInstance } from 'fastify'
import { RequestContext } from '@mikro-orm/core'
import { createApp } from '../../app.js'
import { initORM } from '../../db.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { SerialToken } from './entity.js'
import { hash, mint } from './tokens.js'
import { forgetEverything } from './relay.js'

/*
 * The relay, with a real socket at each end.
 *
 * `app.inject` cannot upgrade a connection, so this listens on a port and
 * connects to it — which is also the only way to find out whether the frame
 * types survive the trip, and that is the property the whole path rests on.
 */

const AGENT_TOKEN = 'test-agent-token'

let app: FastifyInstance
let base: string
let exhibitorId: number
let clientToken: string

/* The host has to name an exhibition, the same as any other request here. */
const HOST = 'localhost:3000'

const openSocket = (path: string, token?: string) =>
  new WebSocket(`${base}${path}`, {
    headers: {
      Host: HOST,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

const opened = (socket: WebSocket) =>
  new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })

const nextText = (socket: WebSocket) =>
  new Promise<Record<string, unknown>>((resolve) => {
    socket.on('message', function once(raw: Buffer, isBinary: boolean) {
      if (isBinary) return
      socket.off('message', once)
      resolve(JSON.parse(raw.toString()))
    })
  })

const nextBinary = (socket: WebSocket) =>
  new Promise<Buffer>((resolve) => {
    socket.on('message', function once(raw: Buffer, isBinary: boolean) {
      if (!isBinary) return
      socket.off('message', once)
      resolve(raw as Buffer)
    })
  })

const closed = (socket: WebSocket) =>
  new Promise<{ code: number; reason: string }>((resolve) =>
    socket.once('close', (code, reason) => resolve({ code, reason: reason.toString() })),
  )

/*
 * A rejected connection is upgraded and then closed, because the plugin
 * completes the handshake before a hook could stop it. So what a refusal looks
 * like from here is a close code and something to read, not a failed dial.
 */
const UNAUTHORISED = 4401
const UNAVAILABLE = 4503

beforeAll(async () => {
  process.env.SERIAL_AGENT_TOKEN = AGENT_TOKEN
  app = await createApp({ migrate: false })
  await app.listen({ port: 0, host: '127.0.0.1' })

  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('no port')
  base = `ws://127.0.0.1:${address.port}`

  const db = await initORM()
  await RequestContext.create(db.em, async () => {
    const [exhibitor] = await db.em.find(Exhibitor, {}, { limit: 1, populate: ['user'] })
    if (!exhibitor) throw new Error('the seed has no exhibitor to hang a token on')
    exhibitorId = exhibitor.id

    const minted = mint()
    clientToken = minted.token
    await db.em.persistAndFlush(
      db.em.create(SerialToken, {
        exhibitor,
        tokenHash: minted.tokenHash,
        prefix: minted.prefix,
        label: 'the test',
        expiresAt: minted.expiresAt,
      }),
    )
  })
})

afterAll(async () => {
  forgetEverything()
  await app.close()
})

/*
 * An agent that registers and answers what it is asked for, standing in for
 * travelstar. What it does with the pty is its own business; from here it is
 * a socket that dials back with the id it was given.
 */
async function connectAgent(name: string, maxSessions = 16) {
  const control = openSocket('/api/serial/agent', AGENT_TOKEN)
  await opened(control)
  control.send(JSON.stringify({ t: 'hello', name, protocol: 1, maxSessions }))

  /* Registration happens on the server's next tick; wait for it to land. */
  await new Promise((resolve) => setTimeout(resolve, 50))
  return control
}

describe('the relay', () => {
  test('refuses an agent without the secret', async () => {
    const socket = openSocket('/api/serial/agent', 'wrong')
    await opened(socket)
    expect((await closed(socket)).code).toBe(UNAUTHORISED)
  })

  test('refuses a client with no credential at all', async () => {
    const socket = openSocket('/api/serial/session')
    await opened(socket)
    expect((await closed(socket)).code).toBe(UNAUTHORISED)
  })

  test('refuses a client whose token was revoked', async () => {
    const db = await initORM()
    const revoked = mint()
    await RequestContext.create(db.em, async () => {
      const exhibitor = await db.em.findOneOrFail(Exhibitor, { id: exhibitorId })
      await db.em.persistAndFlush(
        db.em.create(SerialToken, {
          exhibitor,
          tokenHash: revoked.tokenHash,
          prefix: revoked.prefix,
          label: 'gone',
          expiresAt: revoked.expiresAt,
          revokedAt: new Date(),
        }),
      )
    })

    const socket = openSocket('/api/serial/session', revoked.token)
    await opened(socket)
    expect((await closed(socket)).code).toBe(UNAUTHORISED)
  })

  test('tells a client when no agent is connected', async () => {
    forgetEverything()
    const client = openSocket('/api/serial/session', clientToken)
    await opened(client)

    const message = await nextText(client)
    expect(message.t).toBe('exit')
    expect(String(message.reason)).toContain('no agent')
    /* The reason first, so it can be printed, and then the close. */
    expect((await closed(client)).code).toBe(UNAVAILABLE)
  })

  /*
   * The whole path: a client arrives, the agent is asked for a session, it
   * dials back with the id, and from then on the two are joined.
   */
  test('joins a client to an agent, and keeps frame types intact', async () => {
    forgetEverything()
    const control = await connectAgent('travelstar')

    const client = openSocket('/api/serial/session?term=vt220&cols=132&rows=50', clientToken)
    await opened(client)

    const open = await nextText(control)
    expect(open.t).toBe('open')
    expect(open.term).toBe('vt220')
    expect(open.cols).toBe(132)
    expect(open.rows).toBe(50)
    const sid = String(open.sid)

    const data = openSocket(`/api/serial/data?sid=${sid}`, AGENT_TOKEN)
    await opened(data)

    /* Values that a text frame would have turned into replacement characters. */
    const eightBit = Buffer.from([0x00, 0x1a, 0x7f, 0x80, 0xfe, 0xff])
    const toClient = nextBinary(client)
    data.send(eightBit, { binary: true })
    expect(Buffer.compare(await toClient, eightBit)).toBe(0)

    const toAgent = nextBinary(data)
    client.send(eightBit, { binary: true })
    expect(Buffer.compare(await toAgent, eightBit)).toBe(0)

    /* And a control frame stays a control frame. */
    const controlFrame = nextText(data)
    client.send(JSON.stringify({ t: 'rate', bps: 960 }))
    expect((await controlFrame).t).toBe('rate')

    client.close()
    data.close()
    control.close()
  })

  test('closes the client when the agent goes away', async () => {
    forgetEverything()
    const control = await connectAgent('travelstar')

    const client = openSocket('/api/serial/session', clientToken)
    await opened(client)
    const open = await nextText(control)

    const data = openSocket(`/api/serial/data?sid=${String(open.sid)}`, AGENT_TOKEN)
    await opened(data)

    const gone = closed(client)
    data.close()
    expect((await gone).code).toBeGreaterThan(0)
    control.close()
  })

  test('refuses a data socket for a session nobody asked for', async () => {
    const data = openSocket('/api/serial/data?sid=invented', AGENT_TOKEN)
    await opened(data)
    expect((await closed(data)).code).toBe(1008)
  })
})

describe('tokens', () => {
  test('are stored as a hash and nothing else', async () => {
    const minted = mint()
    expect(minted.tokenHash).toBe(hash(minted.token))
    expect(minted.tokenHash).not.toContain(minted.token.slice(4))
    expect(minted.prefix.length).toBeLessThan(minted.token.length)
    expect(minted.token.startsWith(minted.prefix)).toBe(true)
  })

  test('expire three months out', async () => {
    const days = (mint().expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThan(89)
    expect(days).toBeLessThan(91)
  })

  test('are refused from the api without a session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/serial/tokens',
      headers: { host: 'localhost:3000' },
    })
    expect(response.statusCode).toBe(401)
  })
})
