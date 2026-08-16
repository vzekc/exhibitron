import { graphqlTest } from '../../test/server.js'
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
