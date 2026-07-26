import { afterAll, beforeAll, expect, test } from 'vitest'
import net from 'node:net'
import http from 'node:http'
import { createApp } from '../app.js'
import { initORM } from '../db.js'
import { FastifyInstance } from 'fastify'

let app: FastifyInstance
let port: number
let pool: { numUsed(): number }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Waits for every connection the pool handed out to come back. A request that
// fails to settle its transaction never returns its connection, so a leak
// keeps the count above zero until the poll gives up. Polling rather than
// sampling once keeps the assertion honest under parallel test load, where a
// release can still be in flight.
const expectPoolDrained = async () => {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (pool.numUsed() === 0) return
    await sleep(25)
  }
  expect(pool.numUsed(), 'connections still checked out of the pool').toBe(0)
}

// Talks raw HTTP so we can send the malformed and truncated requests that a
// vulnerability scanner does, which app.inject() cannot express.
const rawRequest = (payload: string, holdMs: number) =>
  new Promise<void>((resolve) => {
    const socket = net.connect(port, '127.0.0.1', () => socket.write(payload))
    socket.on('error', () => {})
    setTimeout(() => {
      socket.destroy()
      resolve()
    }, holdMs)
  })

// Sends a well-formed request over a real socket. app.inject() drives a mock
// request whose stream stays open until the response is done, so it cannot
// observe what a real request stream does: close as soon as the body has been
// received, while the handler is still running.
const socketRequest = (method: string, path: string, body?: string) =>
  new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          host: 'localhost:3000',
          ...(body
            ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
            : {}),
        },
      },
      (response) => {
        let payload = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => (payload += chunk))
        response.on('end', () => resolve({ statusCode: response.statusCode!, body: payload }))
      },
    )
    request.on('error', reject)
    request.end(body)
  })

beforeAll(async () => {
  app = await createApp({ migrate: false })
  await app.listen({ port: 0, host: '127.0.0.1' })
  port = (app.server.address() as net.AddressInfo).port

  const db = await initORM()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pool = (db.orm.em.getConnection() as any).getKnex().client.pool
})

afterAll(async () => {
  await app.close()
})

test('static and unmatched routes do not open a transaction', async () => {
  const scannerPaths = [
    '/',
    '/index.html',
    '/assets/app.js',
    '/.env',
    '/wp-config.php',
    '/.git/config',
  ]

  for (const url of scannerPaths) {
    const response = await app.inject({
      method: 'GET',
      url,
      headers: { host: 'localhost:3000' },
    })
    expect(response.statusCode).toBeLessThan(500)
  }

  await expectPoolDrained()
})

test('a request that never sends its body releases its connection', async () => {
  // Content-Length promises 50 bytes, only 7 arrive: the handler never runs to
  // completion, so onSend never fires and only the close backstop can release.
  const truncatedPost =
    'POST /graphql HTTP/1.1\r\nHost: localhost:3000\r\n' +
    'Content-Type: application/json\r\nContent-Length: 50\r\n\r\n{"a":1}'

  await Promise.all(Array.from({ length: 5 }, () => rawRequest(truncatedPost, 300)))
  await sleep(500)

  await expectPoolDrained()
})

test('a client that disconnects mid-request releases its connection', async () => {
  const get = 'GET /home.html HTTP/1.1\r\nHost: localhost:3000\r\n\r\n'

  await Promise.all(Array.from({ length: 5 }, () => rawRequest(get, 5)))
  await sleep(500)

  await expectPoolDrained()
})

test('a burst of scanner traffic leaves the pool intact', async () => {
  // More concurrent requests than the pool has connections. If any of them
  // holds on to one, later requests queue until they time out.
  const paths = Array.from({ length: 40 }, (_, i) => `/.env.${i}`)
  const responses = await Promise.all(
    paths.map((url) => app.inject({ method: 'GET', url, headers: { host: 'localhost:3000' } })),
  )

  for (const response of responses) {
    expect(response.statusCode).toBeLessThan(500)
  }
  await expectPoolDrained()
})

test('graphql requests still commit and release', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: { host: 'localhost:3000', 'content-type': 'application/json' },
    payload: JSON.stringify({ query: '{ __typename }' }),
  })

  expect(response.statusCode).toBe(200)
  expect(JSON.parse(response.payload).data).toEqual({ __typename: 'Query' })
  await expectPoolDrained()
})

test('a graphql request over a real socket resolves against a live transaction', async () => {
  const response = await socketRequest(
    'POST',
    '/graphql',
    JSON.stringify({ query: '{ getExhibits { id } }' }),
  )

  expect(response.statusCode).toBe(200)
  const result = JSON.parse(response.body)
  // A transaction settled while the handler was still running surfaces here as
  // "Transaction query already complete" instead of a result.
  expect(result.errors).toBeUndefined()
  expect(Array.isArray(result.data.getExhibits)).toBe(true)
  await expectPoolDrained()
})
