import { graphqlTest, login } from '../../test/server.js'
import { expect } from 'vitest'
import { createHash } from 'crypto'
import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { VisitorPhoto } from './entity.js'
import { hashCode } from './storage.js'

/*
 * Die Prüf-Schnittstelle für Aussteller: gehören Foto-ID und Löschcode
 * zusammen? Über TLS darf der Code selbst in der Anfrage stehen, über
 * schlichtes HTTP beweist ihn der Client mit einer Nonce, ohne ihn zu senden.
 * Der Pi in der Halle beantwortet denselben Austausch aus eigenen Hashes —
 * die Verträge müssen deckungsgleich bleiben.
 */

const sha256hex = (s: string) => createHash('sha256').update(s).digest('hex')
const proofFor = (nonce: string, code: string) => sha256hex(nonce + sha256hex(code))

const mintPhoto = async (app: FastifyInstance) => {
  const exhibitor = await login('daffy@example.com')
  const taken = await app.inject({
    method: 'POST',
    url: '/api/visitor-photo/kamera',
    headers: {
      'content-type': 'image/jpeg',
      host: 'localhost:3000',
      cookie: exhibitor.cookie,
    },
    payload: Buffer.from('ein Bild'),
  })
  expect(taken.statusCode).toBe(201)
  return taken.json() as { id: string; code: string }
}

const fetchNonce = async (app: FastifyInstance, id: string) => {
  const challenge = await app.inject({ method: 'GET', url: `/api/pruefen?id=${id}` })
  expect(challenge.statusCode).toBe(200)
  const { nonce } = challenge.json() as { nonce: string }
  expect(nonce).toMatch(/^[0-9a-f]{32}$/)
  return nonce
}

graphqlTest('der richtige Beweis gilt, und eine Nonce antwortet einmal', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)
  const nonce = await fetchNonce(app, id)

  const url = `/api/pruefen?id=${id}&nonce=${nonce}&proof=${proofFor(nonce, code)}`
  const first = await app.inject({ method: 'GET', url })
  expect(first.statusCode).toBe(200)
  expect(first.json()).toStrictEqual({ valid: true })

  const replayed = await app.inject({ method: 'GET', url })
  expect(replayed.json()).toStrictEqual({ valid: false })
})

graphqlTest('ein falscher Code fällt durch', async (_execute, app) => {
  const { id } = await mintPhoto(app)
  const nonce = await fetchNonce(app, id)

  const response = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&nonce=${nonce}&proof=${proofFor(nonce, 'FALSCHER')}`,
  })
  expect(response.json()).toStrictEqual({ valid: false })
})

graphqlTest('eine Nonce gilt nur für ihre Foto-ID', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)
  const foreign = await fetchNonce(app, 'AAAAAA')

  const response = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&nonce=${foreign}&proof=${proofFor(foreign, code)}`,
  })
  expect(response.json()).toStrictEqual({ valid: false })
})

graphqlTest('der Code selbst geht über TLS und sonst nicht', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)

  const overTls = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&code=${code}`,
    headers: { 'x-forwarded-proto': 'https' },
  })
  expect(overTls.statusCode).toBe(200)
  expect(overTls.json()).toStrictEqual({ valid: true })

  const wrongCode = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&code=FALSCHER`,
    headers: { 'x-forwarded-proto': 'https' },
  })
  expect(wrongCode.json()).toStrictEqual({ valid: false })

  const overPlainHttp = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&code=${code}`,
  })
  expect(overPlainHttp.statusCode).toBe(403)
})

graphqlTest('ein gelöschtes Foto bestätigt nichts mehr', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)

  const deleted = await app.inject({
    method: 'POST',
    url: `/api/visitor-photo/${id}/loeschen`,
    headers: { 'content-type': 'application/json' },
    payload: { code },
  })
  expect(deleted.json()).toStrictEqual({ deleted: true })

  const overTls = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&code=${code}`,
    headers: { 'x-forwarded-proto': 'https' },
  })
  expect(overTls.json()).toStrictEqual({ valid: false })

  const nonce = await fetchNonce(app, id)
  const proved = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&nonce=${nonce}&proof=${proofFor(nonce, code)}`,
  })
  expect(proved.json()).toStrictEqual({ valid: false })
})

graphqlTest('eine unbekannte ID bekommt eine Nonce und ein Nein', async (_execute, app) => {
  const nonce = await fetchNonce(app, 'BBBBBB')

  const response = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=BBBBBB&nonce=${nonce}&proof=${proofFor(nonce, 'PQ4M7XKD')}`,
  })
  expect(response.statusCode).toBe(200)
  expect(response.json()).toStrictEqual({ valid: false })
})

graphqlTest('Missgeformtes wird benannt', async (_execute, app) => {
  const badId = await app.inject({ method: 'GET', url: '/api/pruefen?id=nicht-wohlgeformt' })
  expect(badId.statusCode).toBe(400)

  const proofAlone = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=CCCCCC&proof=${'0'.repeat(64)}`,
  })
  expect(proofAlone.statusCode).toBe(400)
})

graphqlTest('falsche Antworten werden je Foto-ID gezählt', async (_execute, app) => {
  const id = 'DDDDDD'
  for (let i = 0; i < 10; i++) {
    const nonce = await fetchNonce(app, id)
    const response = await app.inject({
      method: 'GET',
      url: `/api/pruefen?id=${id}&nonce=${nonce}&proof=${proofFor(nonce, `RATE${i}XX`)}`,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toStrictEqual({ valid: false })
  }

  const nonce = await fetchNonce(app, id)
  const throttled = await app.inject({
    method: 'GET',
    url: `/api/pruefen?id=${id}&nonce=${nonce}&proof=${proofFor(nonce, 'RATE10XX')}`,
  })
  expect(throttled.statusCode).toBe(429)
})

graphqlTest('MUSTER bestätigt seinen Code und bleibt trotzdem', async (_execute, app) => {
  /* Der veröffentlichte Code des Musterfotos: Aussteller prüfen ihre Clients
     an dem Paar, löschen können sie das Foto damit nicht. */
  const { id } = await mintPhoto(app)

  const db = await initORM()
  const photos = db.em.getRepository(VisitorPhoto)
  const minted = await photos.findOneOrFail({ id })
  photos.create({
    id: 'MUSTER',
    exhibition: minted.exhibition,
    codeHash: hashCode('PQ4M7XKD'),
    tables: [],
    createdAt: new Date(),
  })
  await db.em.flush()

  const validated = await app.inject({
    method: 'GET',
    url: '/api/pruefen?id=MUSTER&code=PQ4M7XKD',
    headers: { 'x-forwarded-proto': 'https' },
  })
  expect(validated.json()).toStrictEqual({ valid: true })

  const refused = await app.inject({
    method: 'POST',
    url: '/api/visitor-photo/MUSTER/loeschen',
    headers: { 'content-type': 'application/json' },
    payload: { code: 'PQ4M7XKD' },
  })
  expect(refused.statusCode).toBe(403)
})
