import { graphqlTest, login } from '../../test/server.js'
import { expect } from 'vitest'

/*
 * Was der QR-Code des Laufzettels ausliefert, hängt am Browser: ein heutiger
 * bekommt die Anwendung, die die Fotoseite in der Ausstellungs-Website zeichnet,
 * ein alter die schlichte Seite, die er allein darstellen kann.
 *
 * Geprüft wird die Weiche, nicht die Datei dahinter: die gebaute Anwendung liegt
 * beim Testlauf nicht vor, wohl aber im Betrieb. Die schlichte Seite trägt eine
 * Überschrift, die die Anwendung nie sendet, und daran ist die Entscheidung zu
 * erkennen.
 */

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const NETSCAPE = 'Mozilla/3.0 (Macintosh; I; 68K)'

/* Wohlgeformt, aber zu keinem Foto — die Weiche greift davor. */
const UNKNOWN_ID = 'K7NP4M'

graphqlTest('the slip leads an old browser to the plain page', async (_execute, app) => {
  const response = await app.inject({
    method: 'GET',
    url: `/foto/${UNKNOWN_ID}`,
    headers: { 'user-agent': NETSCAPE, accept: 'text/html' },
  })

  expect(response.statusCode).toBe(404)
  expect(response.body).toContain('Unbekannter Code')
})

graphqlTest('the slip leads a modern browser to the site itself', async (_execute, app) => {
  const response = await app.inject({
    method: 'GET',
    url: `/foto/${UNKNOWN_ID}`,
    headers: { 'user-agent': CHROME, accept: 'text/html' },
  })

  expect(response.body).not.toContain('Unbekannter Code')
})

graphqlTest('a malformed id is refused whatever asks for it', async (_execute, app) => {
  for (const agent of [CHROME, NETSCAPE]) {
    const response = await app.inject({
      method: 'GET',
      url: '/foto/nicht-wohlgeformt',
      headers: { 'user-agent': agent, accept: 'text/html' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.body).toContain('Unbekannter Code')
  }
})

graphqlTest('the page an unknown id names carries nothing', async (_execute, app) => {
  const response = await app.inject({
    method: 'GET',
    url: `/api/visitor-photo/${UNKNOWN_ID}/page`,
  })

  expect(response.statusCode).toBe(404)
  expect(response.json()).toStrictEqual({ error: 'unknown' })
})

/*
 * Die sechs Zeichen stehen auf dem Laufzettel in Großbuchstaben, getippt werden
 * sie so, wie die Tastatur es gerade anbietet: das Telefon fängt klein an, ein
 * Rechner der Ausstellung schreibt groß. Jede Schreibweise führt auf dasselbe
 * Foto, und die Seite nennt die ID in der Form, in der sie vergeben wurde.
 */
const mixedCase = (id: string) =>
  [...id].map((c, i) => (i % 2 ? c.toLowerCase() : c.toUpperCase())).join('')

graphqlTest('die ID führt in jeder Schreibweise auf dasselbe Foto', async (_execute, app) => {
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
  const { id, code } = taken.json()

  for (const written of [id.toLowerCase(), mixedCase(id)]) {
    const page = await app.inject({ method: 'GET', url: `/api/visitor-photo/${written}/page` })
    expect(page.statusCode).toBe(200)
    expect(page.json().id).toBe(id)

    const plain = await app.inject({
      method: 'GET',
      url: `/foto/${written}`,
      headers: { 'user-agent': NETSCAPE, accept: 'text/html' },
    })
    expect(plain.statusCode).toBe(200)
    expect(plain.body).toContain(id)
  }

  const deleted = await app.inject({
    method: 'POST',
    url: `/api/visitor-photo/${id.toLowerCase()}/loeschen`,
    headers: { 'content-type': 'application/json' },
    payload: { code },
  })
  expect(deleted.json()).toStrictEqual({ deleted: true })
})
