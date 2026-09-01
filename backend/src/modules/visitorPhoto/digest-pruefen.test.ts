import { graphqlTest, login } from '../../test/server.js'
import { expect } from 'vitest'
import { createHash } from 'crypto'
import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { VisitorPhoto } from './entity.js'
import { digestHa1, hashCode } from './storage.js'

/*
 * Die Digest-Prüfung für Partner-Seiten: ein Besitzer tippt seinen Geheimcode
 * in den Digest-Login seines Browsers (RFC 2617), die Partner-Seite reicht die
 * Antwort des Browsers hierher, und die Antwort darauf ist valid true oder
 * false. Der Realm ist Teil des Vertrags und steckt im gespeicherten HA1 —
 * ein Login unter einem anderen Realm kann nie bestätigt werden.
 */

const md5hex = (s: string) => createHash('md5').update(s).digest('hex')

/* Was der Browser rechnet, Feld für Feld aus RFC 2617. */
const browserResponse = (
  ha1: string,
  fields: { method: string; uri: string; nonce: string; nc?: string; cnonce?: string },
) => {
  const ha2 = md5hex(`${fields.method}:${fields.uri}`)
  return fields.nc !== undefined
    ? md5hex(`${ha1}:${fields.nonce}:${fields.nc}:${fields.cnonce}:auth:${ha2}`)
    : md5hex(`${ha1}:${fields.nonce}:${ha2}`)
}

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

const ask = (app: FastifyInstance, params: Record<string, string>) =>
  app.inject({
    method: 'GET',
    url: `/api/digest-pruefen?${new URLSearchParams(params)}`,
  })

graphqlTest('ein echter Login wird bestätigt, ein falscher Code nicht', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)
  const fields = {
    method: 'POST',
    uri: '/bearbeiten',
    nonce: 'abcdef0123456789',
    nc: '00000001',
    cnonce: 'MTc1Njc0',
  }

  const genuine = await ask(app, {
    id,
    ...fields,
    qop: 'auth',
    response: browserResponse(digestHa1(id, code), fields),
  })
  expect(genuine.statusCode).toBe(200)
  expect(genuine.json()).toStrictEqual({ valid: true })

  const forged = await ask(app, {
    id,
    ...fields,
    qop: 'auth',
    response: browserResponse(digestHa1(id, 'FALSCHER'), fields),
  })
  expect(forged.json()).toStrictEqual({ valid: false })
})

graphqlTest('die Form ohne qop (RFC 2069) gilt auch', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)
  const fields = { method: 'GET', uri: '/bearbeiten', nonce: 'feedface' }

  const genuine = await ask(app, {
    id,
    ...fields,
    response: browserResponse(digestHa1(id, code), fields),
  })
  expect(genuine.json()).toStrictEqual({ valid: true })
})

graphqlTest('MUSTER bestätigt seinen veröffentlichten Geheimcode', async (_execute, app) => {
  /* Das dokumentierte HA1 des Musterpaars. Schlägt dieser Wert fehl, hat sich
     der Realm oder die HA1-Formel geändert — und damit der Vertrag, gegen den
     Partner und api.html geschrieben sind. */
  const ha1 = 'f02583eec076f874892a8de36d81aced'
  expect(digestHa1('MUSTER', 'PQ4M7XKD')).toBe(ha1)

  const { id } = await mintPhoto(app)
  const db = await initORM()
  const photos = db.em.getRepository(VisitorPhoto)
  const minted = await photos.findOneOrFail({ id })
  photos.create({
    id: 'MUSTER',
    exhibition: minted.exhibition,
    codeHash: hashCode('PQ4M7XKD'),
    digestHa1: ha1,
    tables: [],
    createdAt: new Date(),
  })
  await db.em.flush()

  const fields = {
    method: 'GET',
    uri: '/muster',
    nonce: '0123456789abcdef',
    nc: '00000001',
    cnonce: 'Zm90b2ZpeA==',
  }
  const genuine = await ask(app, {
    id: 'MUSTER',
    ...fields,
    qop: 'auth',
    response: browserResponse(ha1, fields),
  })
  expect(genuine.json()).toStrictEqual({ valid: true })
})

graphqlTest('ohne gespeichertes HA1 wird kein Login bestätigt', async (_execute, app) => {
  /* Ein Foto von vor dem Digest-Feld: die Reihe steht, das HA1 fehlt. */
  const { id } = await mintPhoto(app)
  const db = await initORM()
  const photos = db.em.getRepository(VisitorPhoto)
  const minted = await photos.findOneOrFail({ id })
  photos.create({
    id: 'FFFFFF',
    exhibition: minted.exhibition,
    codeHash: hashCode('PQ4M7XKD'),
    tables: [],
    createdAt: new Date(),
  })
  await db.em.flush()

  const fields = { method: 'GET', uri: '/x', nonce: 'aa' }
  const answer = await ask(app, {
    id: 'FFFFFF',
    ...fields,
    response: browserResponse(digestHa1('FFFFFF', 'PQ4M7XKD'), fields),
  })
  expect(answer.json()).toStrictEqual({ valid: false })
})

graphqlTest('ein gelöschtes Foto bestätigt keinen Login mehr', async (_execute, app) => {
  const { id, code } = await mintPhoto(app)

  const deleted = await app.inject({
    method: 'POST',
    url: `/api/visitor-photo/${id}/loeschen`,
    headers: { 'content-type': 'application/json' },
    payload: { code },
  })
  expect(deleted.json()).toStrictEqual({ deleted: true })

  const fields = { method: 'GET', uri: '/x', nonce: 'aa' }
  const answer = await ask(app, {
    id,
    ...fields,
    response: browserResponse(digestHa1(id, code), fields),
  })
  expect(answer.json()).toStrictEqual({ valid: false })
})

graphqlTest('Missgeformtes wird benannt', async (_execute, app) => {
  const badId = await ask(app, { id: 'nicht-wohlgeformt' })
  expect(badId.statusCode).toBe(400)

  const noUri = await ask(app, {
    id: 'GGGGGG',
    method: 'GET',
    nonce: 'aa',
    response: '0'.repeat(32),
  })
  expect(noUri.statusCode).toBe(400)

  const noNonce = await ask(app, {
    id: 'GGGGGG',
    method: 'GET',
    uri: '/x',
    response: '0'.repeat(32),
  })
  expect(noNonce.statusCode).toBe(400)

  const badResponse = await ask(app, {
    id: 'GGGGGG',
    method: 'GET',
    uri: '/x',
    nonce: 'aa',
    response: 'kein-md5',
  })
  expect(badResponse.statusCode).toBe(400)

  const badQop = await ask(app, {
    id: 'GGGGGG',
    method: 'GET',
    uri: '/x',
    nonce: 'aa',
    qop: 'auth-int',
    response: '0'.repeat(32),
  })
  expect(badQop.statusCode).toBe(400)

  const qopAlone = await ask(app, {
    id: 'GGGGGG',
    method: 'GET',
    uri: '/x',
    nonce: 'aa',
    qop: 'auth',
    response: '0'.repeat(32),
  })
  expect(qopAlone.statusCode).toBe(400)
})

graphqlTest('falsche Antworten werden je Foto-ID gezählt', async (_execute, app) => {
  const fields = { method: 'GET', uri: '/x', nonce: 'aa' }
  for (let i = 0; i < 10; i++) {
    const answer = await ask(app, { id: 'HHHHHH', ...fields, response: md5hex(`Versuch ${i}`) })
    expect(answer.statusCode).toBe(200)
    expect(answer.json()).toStrictEqual({ valid: false })
  }

  const throttled = await ask(app, { id: 'HHHHHH', ...fields, response: md5hex('Versuch 10') })
  expect(throttled.statusCode).toBe(429)
})
