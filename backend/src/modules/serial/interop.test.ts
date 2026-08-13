import { afterAll, beforeAll, expect, test } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { WebSocket } from 'ws'
import { FastifyInstance } from 'fastify'
import { RequestContext } from '@mikro-orm/core'
import { createApp } from '../../app.js'
import { initORM } from '../../db.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { SerialToken } from './entity.js'
import { mint } from './tokens.js'
import { forgetEverything } from './relay.js'

/*
 * The relay against the real agent, from the other repository.
 *
 * Everything else is either side of the protocol tested against a stub. This
 * runs the agent that will be on travelstar, so that the two halves are known
 * to agree about what they say to each other.
 *
 * The agent lives in the fotofix repository, which is a separate checkout and
 * is not there on a build machine. Point FOTOFIX_AGENT_DIR at it to run this;
 * without it there is nothing to test against and the test says so.
 */

const AGENT_DIR =
  process.env.FOTOFIX_AGENT_DIR ?? `${process.env.HOME}/Development/privat/fotofix/serial/agent`
const HAVE_AGENT = existsSync(AGENT_DIR)
const AGENT_TOKEN = 'interop-token'

let app: FastifyInstance
let base: string
let clientToken: string
let agent: ChildProcess

beforeAll(async () => {
  if (!HAVE_AGENT) return
  process.env.SERIAL_AGENT_TOKEN = AGENT_TOKEN
  app = await createApp({ migrate: false })
  await app.listen({ port: 0, host: '127.0.0.1' })
  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('no port')
  base = `ws://127.0.0.1:${address.port}`

  const db = await initORM()
  await RequestContext.create(db.em, async () => {
    const [exhibitor] = await db.em.find(Exhibitor, {}, { limit: 1 })
    const minted = mint()
    clientToken = minted.token
    await db.em.persistAndFlush(
      db.em.create(SerialToken, {
        exhibitor,
        tokenHash: minted.tokenHash,
        prefix: minted.prefix,
        label: 'interop',
        expiresAt: minted.expiresAt,
      }),
    )
  })

  agent = spawn('npx', ['tsx', 'src/agent.ts'], {
    cwd: AGENT_DIR,
    env: {
      ...process.env,
      FOTOFIX_SERIAL_ENDPOINT: base,
      FOTOFIX_SERIAL_TOKEN: AGENT_TOKEN,
      FOTOFIX_SERIAL_NAME: 'travelstar',
      FOTOFIX_SERIAL_COMMAND: 'stty raw -echo; exec /bin/sh',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  })

  /* Give it long enough to compile itself and register. */
  await new Promise((resolve) => setTimeout(resolve, 4000))
})

afterAll(async () => {
  if (!HAVE_AGENT) return
  agent?.kill('SIGKILL')
  forgetEverything()
  await app.close()
})

test.skipIf(!HAVE_AGENT)(
  'the agent serves a session through the relay, eight bits intact',
  async () => {
    const client = new WebSocket(`${base}/api/serial/session?term=vt100&cols=80&rows=24`, {
      headers: { Host: 'localhost:3000', Authorization: `Bearer ${clientToken}` },
    })

    const chunks: Buffer[] = []
    let reason = ''
    client.on('message', (raw: Buffer, isBinary: boolean) => {
      if (isBinary) chunks.push(raw)
      else reason = raw.toString()
    })

    await new Promise<void>((resolve, reject) => {
      client.once('open', () => resolve())
      client.once('error', reject)
    })

    client.send(JSON.stringify({ t: 'rate', bps: 200_000 }))
    await new Promise((resolve) => setTimeout(resolve, 800))

    client.send(Buffer.from("printf '\\377\\376\\200'\n"), { binary: true })
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const got = Buffer.concat(chunks)
    client.close()

    expect(reason, `the relay refused: ${reason}`).not.toContain('exit')
    expect(got.length).toBeGreaterThan(0)
    expect(got.indexOf(Buffer.from([0xff, 0xfe, 0x80]))).toBeGreaterThanOrEqual(0)
  },
)
