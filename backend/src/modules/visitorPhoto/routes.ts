import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomBytes, timingSafeEqual } from 'crypto'
import { spawn } from 'child_process'
import * as path from 'path'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { marked } from 'marked'
import { initORM } from '../../db.js'
import { VisitorPhoto } from './entity.js'
import { Table } from '../table/entity.js'
import { isModernBrowser } from '../serverSideHtml/browser-detection.js'
import {
  renderPhotoPage,
  renderDeletedPage,
  renderDeletedConfirmation,
  renderNotFound,
  renderNotForYou,
  renderPrivacyPage,
} from './pages.js'
import {
  cameraAssetType,
  isCameraAsset,
  readSample,
  isLanguage,
  isStep,
  readCameraAsset,
  renderCameraPage,
  stampAfter,
} from './camera.js'
import { buildReceiptSvg, ditherAtkinson, rasteriseSvg, rgbaToGray } from './receipt.js'
import { receiptPdf } from './pdf.js'
import {
  codeMatches,
  generateDeleteCode,
  generatePhotoId,
  describePhotoFiles,
  hashCode,
  isWellFormedCode,
  isWellFormedId,
  listPhotoFiles,
  normalizePhotoId,
  photoDir,
  readPhotoFile,
  removePhotoFiles,
  writePhotoFile,
} from './storage.js'

/*
 * The visitor's photo: the page they reach from the QR code on their slip, the
 * downloads, and the form that deletes the lot.
 *
 * These pages are public and unlisted. There is no route that lists photos and
 * no way to reach one without the id, because a browsable wall of visitors'
 * faces is a very different thing to have consented to than "here is yours".
 */

/* What the booth is allowed to say, and nobody else. */
const BOOTH_TOKEN = process.env.VISITOR_PHOTO_TOKEN ?? ''

/* Six characters is a billion combinations: plenty against a person, nothing
   against a script, so guesses are counted. */
const MAX_ATTEMPTS = 10
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
const attempts = new Map<string, { count: number; first: number }>()

function tooManyAttempts(id: string) {
  const now = Date.now()
  const seen = attempts.get(id)
  if (!seen || now - seen.first > ATTEMPT_WINDOW_MS) {
    attempts.set(id, { count: 1, first: now })
    return false
  }
  seen.count += 1
  return seen.count > MAX_ATTEMPTS
}

/*
 * The validation API's nonce ledger and its own guess counter. A nonce answers
 * once, expires after two minutes, and is bound to the id it was issued for.
 * Failures are counted apart from the deletion form's counter: an exhibitor
 * checking pairs does not use up a visitor's tries at their own deletion form.
 */
const NONCE_TTL_MS = 2 * 60 * 1000
const VALIDATE_LIMIT = 10
const VALIDATE_WINDOW_MS = 60 * 1000
const nonces = new Map<string, { id: string; expires: number }>()
const validateFailures = new Map<string, { count: number; since: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [nonce, issued] of nonces) if (issued.expires < now) nonces.delete(nonce)
  for (const [id, seen] of validateFailures)
    if (now - seen.since > VALIDATE_WINDOW_MS) validateFailures.delete(id)
}, 60 * 1000).unref()

function tooManyValidateFailures(id: string) {
  const seen = validateFailures.get(id)
  return (
    seen !== undefined &&
    Date.now() - seen.since <= VALIDATE_WINDOW_MS &&
    seen.count >= VALIDATE_LIMIT
  )
}

function recordValidateFailure(id: string) {
  const seen = validateFailures.get(id)
  if (seen === undefined || Date.now() - seen.since > VALIDATE_WINDOW_MS) {
    validateFailures.set(id, { count: 1, since: Date.now() })
  } else {
    seen.count += 1
  }
}

function hexEqual(a: string, b: string) {
  const left = Buffer.from(a, 'hex')
  const right = Buffer.from(b, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}

function boothAuthorised(request: FastifyRequest) {
  const given = request.headers['x-booth-token']
  return BOOTH_TOKEN.length > 0 && given === BOOTH_TOKEN
}

function noIndex(reply: FastifyReply) {
  reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  reply.header('Cache-Control', 'private, no-store')
}

/*
 * Every photo arrives here as a bare JPEG and waits for the machine with the
 * encoders on it, whichever camera took it: the booth pushes the picture before
 * it prints the receipt, so that the page exists by the time a visitor can scan
 * the code on their slip, and the formats follow when they have been made. That
 * is a wait the page has to account for rather than showing a single download
 * and looking complete.
 */
const converting = (photo: VisitorPhoto) =>
  photo.convertedAt ? undefined : { since: photo.createdAt }

/*
 * The booth's Datenschutzerklärung, written for the photo booth and for nothing
 * else. It lives with this module rather than in the site's docs directory: the
 * general one there is served to anybody who asks for a document by name, and
 * this one is only ever the right answer on a page that a photo is reached
 * from. The site's own privacy notice is the forum's, linked from the footer.
 */
const PRIVACY_DOC = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
  'assets/foto/datenschutz.md',
)

/* Read once: it is a document that changes when the code does, and a deployment
   restarts this process. */
let privacyHtml: string | undefined

async function privacyPage() {
  privacyHtml ??= renderPrivacyPage(await marked(await readFile(PRIVACY_DOC, 'utf8')))
  return privacyHtml
}

export async function registerVisitorPhotoRoutes(app: FastifyInstance) {
  const db = await initORM()
  const photos = db.em.getRepository(VisitorPhoto)

  /* ── the booth ─────────────────────────────────────────────────────────── */

  /*
   * The booth sends the picture before it prints, so that the page exists by
   * the time anybody can scan the code on the paper.
   */
  app.put<{ Params: { id: string } }>('/api/visitor-photo/:id', async (request, reply) => {
    if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

    const id = normalizePhotoId(request.params.id)
    if (!isWellFormedId(id)) return reply.code(400).send({ error: 'malformed id' })

    const codeHash = String(request.headers['x-code-hash'] ?? '')
    if (!/^[0-9a-f]{64}$/.test(codeHash)) {
      return reply.code(400).send({ error: 'missing or malformed code hash' })
    }

    const body = request.body as Buffer
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return reply.code(400).send({ error: 'no picture' })
    }

    const exhibition = request.apolloContext.exhibition
    const existing = await photos.findOne({ id })
    if (existing?.deletedAt) {
      /* Deleted means deleted; a repeat upload must not resurrect it. */
      return reply.code(410).send({ error: 'deleted' })
    }

    const tablesHeader = String(request.headers['x-tables'] ?? '')
    const tables = tablesHeader
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)

    const photo =
      existing ?? photos.create({ id, exhibition, codeHash, tables, createdAt: new Date() })
    photo.codeHash = codeHash
    photo.tables = tables
    await db.em.persistAndFlush(photo)

    await writePhotoFile(id, 'photo.jpg', body)
    request.log.info({ id, bytes: body.length }, 'visitor photo received')
    return reply.code(201).send({ id })
  })

  /*
   * The photos that have no formats yet, oldest first. The encoders live on the
   * machine at the booth, and this list is what it works from: it fetches a
   * camera-page photo, converts whatever it does not already hold, and pushes
   * the files back. A photo stays on the list until it says it is done, so a
   * transfer that broke off is finished by the round after it.
   */
  app.get('/api/visitor-photo/pending', async (request, reply) => {
    if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

    const exhibition = request.apolloContext.exhibition
    const waiting = await photos.find(
      { exhibition, convertedAt: null, deletedAt: null },
      { fields: ['id'], orderBy: { createdAt: 'asc' } },
    )
    return reply.send({ pending: waiting.map((p) => p.id) })
  })

  /* The picture to convert. */
  app.get<{ Params: { id: string } }>('/api/visitor-photo/:id/original', async (request, reply) => {
    if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

    const id = normalizePhotoId(request.params.id)
    if (!isWellFormedId(id)) return reply.code(400).send({ error: 'malformed id' })

    const photo = await photos.findOne({ id })
    if (!photo || photo.deletedAt) return reply.code(404).send({ error: 'unknown' })

    reply.type('image/jpeg')
    return readPhotoFile(id, 'photo.jpg')
  })

  /*
   * One converted file. They arrive one at a time rather than in a bundle, so
   * that a transfer interrupted halfway leaves the ones that made it and the
   * next attempt sends what is missing.
   */
  app.put<{ Params: { id: string; name: string } }>(
    '/api/visitor-photo/:id/datei/:name',
    async (request, reply) => {
      if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

      const id = normalizePhotoId(request.params.id)
      const { name } = request.params
      if (!isWellFormedId(id)) return reply.code(400).send({ error: 'malformed id' })

      /* The photo itself is what was uploaded here and stays authoritative; a
         converter pushing it back could only replace it with a worse copy. */
      if (!/^[a-z0-9][a-z0-9._-]*$/.test(name) || name === 'photo.jpg') {
        return reply.code(400).send({ error: 'not a name a format may have' })
      }

      const photo = await photos.findOne({ id })
      if (!photo) return reply.code(404).send({ error: 'unknown' })
      if (photo.deletedAt) return reply.code(410).send({ error: 'deleted' })

      const body = request.body as Buffer
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return reply.code(400).send({ error: 'no file' })
      }

      await writePhotoFile(id, name, body)
      return reply.code(201).send({ id, name })
    },
  )

  /* Said once the last format has been pushed, which is what stops the photo's
     page saying its formats are still on their way. */
  app.post<{ Params: { id: string } }>(
    '/api/visitor-photo/:id/konvertiert',
    async (request, reply) => {
      if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

      const id = normalizePhotoId(request.params.id)
      if (!isWellFormedId(id)) return reply.code(400).send({ error: 'malformed id' })

      const photo = await photos.findOne({ id })
      if (!photo) return reply.code(404).send({ error: 'unknown' })
      if (photo.deletedAt) return reply.code(410).send({ error: 'deleted' })

      photo.convertedAt = new Date()
      await db.em.persistAndFlush(photo)
      request.log.info({ id }, 'visitor photo converted')
      return reply.send({ id })
    },
  )

  /*
   * Every id that has been deleted. The booth asks for the whole set rather
   * than what changed, so a booth that was rebooted, or off the network for an
   * hour, converges the moment it comes back — and a conversion that finishes
   * after a deletion is cleaned up on the next round.
   */
  app.get('/api/visitor-photo/deleted', async (request, reply) => {
    if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

    const deleted = await photos.find({ deletedAt: { $ne: null } }, { fields: ['id'] })
    return reply.send({ deleted: deleted.map((p) => p.id) })
  })

  /*
   * The tables the booth should print on a visitor's slip: those whose holder
   * has said a machine on them can show a photo. Printing numbers at random
   * would send visitors to tables with nothing to show, which is what happens
   * today.
   */
  app.get('/api/visitor-photo/tables', async (request, reply) => {
    if (!boothAuthorised(request)) return reply.code(403).send({ error: 'not the booth' })

    const exhibition = request.apolloContext.exhibition
    const tables = await db.em.find(
      Table,
      { exhibition, showsVisitorPhotos: true },
      { fields: ['number'], orderBy: { number: 'asc' } },
    )
    return reply.send({ tables: tables.map((t) => t.number) })
  })

  /* ── the camera page ───────────────────────────────────────────────────── */

  /*
   * The booth as a web page, for an exhibitor who wants to see what happens to
   * a photo without queueing at the machine in the entrance hall. What it takes
   * is a photo like any other: same ids, same page, same formats, same deletion
   * code — testing anything less would not be testing this.
   *
   * It is behind the exhibitor's own login. A visitor's route to a photo is the
   * booth, and an open camera page would be a second one, unstaffed, with
   * nobody standing beside it to say what is about to happen to the picture.
   */
  const asExhibitor = (request: FastifyRequest) => request.apolloContext?.exhibitor ?? null

  app.get('/foto/kamera', async (request, reply) => {
    noIndex(reply)
    if (!asExhibitor(request)) {
      return reply.code(403).type('text/html').send(renderNotForYou())
    }
    return reply.type('text/html').send(await renderCameraPage())
  })

  /* The faces the invitation shows. Named rather than listed here: the page
     was given the listing when it was rendered. */
  app.get<{ Params: { file: string } }>('/foto/kamera/samples/:file', async (request, reply) => {
    if (!asExhibitor(request)) return reply.code(403).send({ error: 'not an exhibitor' })

    const body = await readSample(request.params.file)
    if (!body) return reply.code(404).send({ error: 'unknown' })

    reply.header('Cache-Control', 'private, max-age=3600')
    reply.type('image/png')
    return body
  })

  app.get<{ Params: { asset: string } }>('/foto/kamera/:asset', async (request, reply) => {
    if (!asExhibitor(request)) return reply.code(403).send({ error: 'not an exhibitor' })

    const { asset } = request.params
    if (!isCameraAsset(asset)) return reply.code(404).send({ error: 'unknown' })

    reply.header('Cache-Control', 'private, max-age=300')
    reply.type(cameraAssetType(asset))
    return readCameraAsset(asset)
  })

  /*
   * The step, in the address: /foto/kamera/de/live is the screen that
   * screens/de/live.html draws. The page reads it to know where to start, and
   * writes it as it moves, so that a reload comes back to the same screen and
   * the address names the template to open while editing it.
   */
  app.get<{ Params: { lang: string; step: string } }>(
    '/foto/kamera/:lang/:step',
    async (request, reply) => {
      noIndex(reply)
      if (!asExhibitor(request)) {
        return reply.code(403).type('text/html').send(renderNotForYou())
      }

      const { lang, step } = request.params
      if (!isStep(step) || !(await isLanguage(lang))) {
        return reply.code(404).type('text/html').send(renderNotFound())
      }
      return reply.type('text/html').send(await renderCameraPage())
    },
  )

  /*
   * When the screens were last written. The page asks while it is being worked
   * on and reloads itself when the answer changes; a save therefore shows up
   * without touching the browser, on the step that is already open.
   *
   * The question is held until the answer differs from what the asker already
   * has, so a save is answered the moment it lands and an idle editor asks
   * three times a minute rather than sixty. Every request here opens a database
   * transaction, and sixty a minute was enough to starve the ones that need it.
   */
  app.get<{ Querystring: { since?: string } }>('/foto/kamera/stamp', async (request, reply) => {
    if (!asExhibitor(request)) return reply.code(403).send({ error: 'not an exhibitor' })

    reply.header('Cache-Control', 'no-store')
    /* A browser that has gone away should not be waited for. */
    const stamp = await stampAfter(request.query.since, () => reply.raw.destroyed)
    return reply.send({ stamp })
  })

  /*
   * The capture. The id and the deletion code are minted here and the code goes
   * back in the response, because this is the only moment it exists in the open
   * — after this there is a hash and nothing else, exactly as with a slip that
   * has been printed and handed over.
   */
  app.post('/api/visitor-photo/kamera', async (request, reply) => {
    if (!asExhibitor(request)) return reply.code(403).send({ error: 'not an exhibitor' })

    const body = request.body as Buffer
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return reply.code(400).send({ error: 'no picture' })
    }

    const exhibition = request.apolloContext.exhibition
    const showing = await db.em.find(
      Table,
      { exhibition, showsVisitorPhotos: true },
      { fields: ['number'], orderBy: { number: 'asc' } },
    )

    /* Six characters from a 32-character alphabet is a billion, and a booth
       makes a few hundred photos: a collision is a lost photo, not a lost
       afternoon, so it is worth the one extra query. */
    let id = generatePhotoId()
    while (await photos.findOne({ id })) id = generatePhotoId()

    const code = generateDeleteCode()
    const photo = photos.create({
      id,
      exhibition,
      codeHash: hashCode(code),
      tables: showing.map((t) => t.number),
      source: 'web',
      createdAt: new Date(),
    })
    await db.em.persistAndFlush(photo)
    await writePhotoFile(id, 'photo.jpg', body)

    request.log.info({ id, bytes: body.length }, 'photo taken on the camera page')
    return reply.code(201).send({ id, code })
  })

  /*
   * The slip, for a photo that had no printer in front of it.
   *
   * It carries the deletion code, so it is rendered against a code the caller
   * already holds rather than being a file anyone with the id could fetch. That
   * is the same proof the deletion form asks for, and it is counted the same
   * way.
   */
  app.post<{ Params: { id: string }; Body: { code?: string } }>(
    '/foto/:id/beleg.pdf',
    async (request, reply) => {
      noIndex(reply)
      const id = normalizePhotoId(request.params.id)
      const code = String(request.body?.code ?? '')
        .toUpperCase()
        .replace(/\s+/g, '')

      if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

      const photo = await photos.findOne({ id })
      if (!photo || photo.deletedAt) return reply.code(404).send({ error: 'unknown' })
      if (tooManyAttempts(id)) return reply.code(429).send({ error: 'zu viele Versuche' })
      if (!isWellFormedCode(code) || !codeMatches(code, photo.codeHash)) {
        return reply.code(403).send({ error: 'der Code stimmt nicht' })
      }

      const svg = await buildReceiptSvg(
        await readPhotoFile(id, 'photo.jpg'),
        id,
        code,
        photo.tables,
        `${request.apolloContext.siteUrl}/foto/`,
      )
      const { pixels, width, height } = await rasteriseSvg(svg)
      const dots = ditherAtkinson(rgbaToGray(pixels, width, height), width, height)

      reply.header('Content-Disposition', `attachment; filename="${id}-beleg.pdf"`)
      reply.type('application/pdf')
      return reply.send(receiptPdf(dots, width, height))
    },
  )

  /* ── the visitor ───────────────────────────────────────────────────────── */

  /*
   * The same page as `/foto/:id` renders, for the site to draw itself. A photo
   * that was deleted says so and nothing else: the id stays a valid address for
   * as long as the row does, and the answer to it is that there is nothing here.
   */
  app.get<{ Params: { id: string } }>('/api/visitor-photo/:id/page', async (request, reply) => {
    noIndex(reply)
    const id = normalizePhotoId(request.params.id)
    if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

    const photo = await photos.findOne({ id })
    if (!photo) return reply.code(404).send({ error: 'unknown' })
    if (photo.deletedAt) return reply.send({ id, deleted: true })

    return reply.send({
      id,
      deleted: false,
      converting: !!converting(photo),
      groups: await describePhotoFiles(id),
      tables: photo.tables,
    })
  })

  /*
   * Deletion for the embedded page. It asks for the same proof and counts the
   * attempts the same way as the form on the plain page; only the answer is
   * JSON rather than a rendered page.
   */
  app.post<{ Params: { id: string }; Body: { code?: string } }>(
    '/api/visitor-photo/:id/loeschen',
    async (request, reply) => {
      noIndex(reply)
      const id = normalizePhotoId(request.params.id)
      const code = String(request.body?.code ?? '')
        .toUpperCase()
        .replace(/\s+/g, '')

      if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

      const photo = await photos.findOne({ id })
      if (!photo) return reply.code(404).send({ error: 'unknown' })
      if (photo.deletedAt) return reply.send({ deleted: true })

      /* MUSTER's deletion code is published for exhibitors to test the
         validation API against, so the demo photo refuses the deletion the
         code would otherwise buy. */
      if (id === 'MUSTER') {
        return reply.code(403).send({ error: 'Das Musterfoto lässt sich nicht löschen.' })
      }

      if (tooManyAttempts(id)) {
        return reply.code(429).send({ error: 'Zu viele Versuche. Bitte später noch einmal.' })
      }
      if (!isWellFormedCode(code) || !codeMatches(code, photo.codeHash)) {
        return reply.code(400).send({
          error: 'Der Code stimmt nicht. Er steht auf dem Laufzettel unter „Foto wieder löschen?“.',
        })
      }

      await removePhotoFiles(id)
      photo.deletedAt = new Date()
      await db.em.persistAndFlush(photo)
      request.log.info({ id }, 'visitor asked for their photo to be deleted')

      return reply.send({ deleted: true })
    },
  )

  /* ── the exhibitor's client ────────────────────────────────────────────── */

  /*
   * Validation: do this foto-id and this deletion code belong together? The
   * answer is {"valid":true|false} and nothing else — for the exhibitor whose
   * machine shows a visitor's photo and is handed the slip. Over TLS the code
   * may stand in the request itself; over plain HTTP the client proves it
   * through a nonce instead, so the code never crosses the wire unencrypted:
   *
   *     GET /api/pruefen?id=K7NP4M                    -> {"nonce":"<32 hex>"}
   *     GET /api/pruefen?id=K7NP4M&nonce=…&proof=sha256hex(nonce + sha256hex(code))
   *                                                   -> {"valid":true}
   *
   * The Pi in the hall answers the same exchange at the same path from its own
   * hashes, and the fotofix.classic-computing.de vhost proxies both of its
   * ports here. The flows are documented for exhibitors on the fotofix landing
   * pages (api.html in the fotofix repository); the answers match the intake's
   * byte for byte, trailing newline included, so a client built against one
   * end works against the other.
   */
  app.get<{ Querystring: { id?: string; code?: string; nonce?: string; proof?: string } }>(
    '/api/pruefen',
    async (request, reply) => {
      noIndex(reply)
      const json = (status: number, body: unknown) =>
        reply
          .code(status)
          .type('application/json')
          .send(JSON.stringify(body) + '\n')

      const id = normalizePhotoId(String(request.query.id ?? '').trim())
      if (!isWellFormedId(id)) return json(400, { error: 'malformed id' })

      /* A deleted photo's code stops validating with it: the hash to check
         against is only ever a living photo's. */
      const storedHash = async () => {
        const photo = await photos.findOne({ id })
        return photo && !photo.deletedAt ? photo.codeHash : null
      }

      if (request.query.code !== undefined) {
        if (request.protocol !== 'https') {
          return json(403, { error: 'code nur ueber https — hier nonce und proof verwenden' })
        }
        if (tooManyValidateFailures(id)) return json(429, { error: 'zu viele Versuche' })
        const code = String(request.query.code).toUpperCase().replace(/\s+/g, '')
        const codeHash = await storedHash()
        const valid = codeHash !== null && isWellFormedCode(code) && codeMatches(code, codeHash)
        if (!valid) recordValidateFailure(id)
        return json(200, { valid })
      }

      const nonceParam = request.query.nonce
      const proofParam = request.query.proof?.trim().toLowerCase()

      if (nonceParam === undefined && proofParam === undefined) {
        /* Issued for any well-formed id, so the challenge says nothing about
           whether a photo exists. */
        const nonce = randomBytes(16).toString('hex')
        nonces.set(nonce, { id, expires: Date.now() + NONCE_TTL_MS })
        return json(200, { nonce })
      }

      if (
        nonceParam === undefined ||
        proofParam === undefined ||
        !/^[0-9a-f]{64}$/.test(proofParam)
      ) {
        return json(400, { error: 'nonce und proof gehoeren zusammen' })
      }

      /* One answer per nonce, whichever answer it is. */
      const issued = nonces.get(nonceParam)
      nonces.delete(nonceParam)

      if (tooManyValidateFailures(id)) return json(429, { error: 'zu viele Versuche' })

      if (issued === undefined || issued.expires < Date.now() || issued.id !== id) {
        recordValidateFailure(id)
        return json(200, { valid: false })
      }

      const codeHash = await storedHash()
      const valid = codeHash !== null && hexEqual(proofParam, hashCode(nonceParam + codeHash))
      if (!valid) recordValidateFailure(id)
      return json(200, { valid })
    },
  )

  /* Linked from the footer of every page here, and from nowhere else. */
  app.get('/foto/datenschutz', async (_request, reply) => {
    noIndex(reply)
    return reply.type('text/html').send(await privacyPage())
  })

  /*
   * The slip's QR code leads here, and what arrives is either a visitor's phone
   * or a machine from the hall. A browser that can run the site gets the site,
   * which draws the photo inside the exhibition's own pages; everything older
   * gets the plain page, which is the only one it could render anyway.
   */
  app.get<{ Params: { id: string } }>('/foto/:id', async (request, reply) => {
    noIndex(reply)
    const id = normalizePhotoId(request.params.id)
    if (isWellFormedId(id) && isModernBrowser(request)) {
      return reply.type('text/html').sendFile('index.html')
    }
    if (!isWellFormedId(id)) return reply.code(404).type('text/html').send(renderNotFound())

    const photo = await photos.findOne({ id })
    if (!photo) return reply.code(404).type('text/html').send(renderNotFound())
    if (photo.deletedAt) return reply.type('text/html').send(renderDeletedPage())

    return reply.type('text/html').send(
      renderPhotoPage(id, await describePhotoFiles(id), photo.tables, {
        converting: converting(photo),
      }),
    )
  })

  /*
   * A download's name is the photo id plus the file's own name, so files from
   * several photos sit side by side on one disk. The PCX files are fetched for
   * DOS machines, which keep a file under an 8.3 name: they download as the
   * six-character id plus `_1` or `_8` for the bit depth, which fits in eight.
   */
  const downloadName = (id: string, file: string) => {
    if (file === 'pcx_1tek.pcx') return `${id}_1.pcx`
    if (file === 'pcx-color.pcx') return `${id}_8.pcx`
    return `${id}-${file}`
  }

  app.get<{ Params: { id: string; file: string } }>('/foto/:id/:file', async (request, reply) => {
    noIndex(reply)
    const id = normalizePhotoId(request.params.id)
    const { file } = request.params
    if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

    const photo = await photos.findOne({ id })
    if (!photo || photo.deletedAt) return reply.code(404).send({ error: 'unknown' })

    const files = await listPhotoFiles(id)
    if (!files.includes(file)) return reply.code(404).send({ error: 'unknown' })

    reply.header('Content-Disposition', `attachment; filename="${downloadName(id, file)}"`)
    reply.type(file.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream')
    return readPhotoFile(id, file)
  })

  /*
   * Everything in one file. The formats are already compressed binaries, so it
   * is stored rather than deflated — quicker, and no smaller either way.
   */
  app.get<{ Params: { id: string } }>('/foto/:id/alle-formate.zip', async (request, reply) => {
    noIndex(reply)
    const id = normalizePhotoId(request.params.id)
    if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

    const photo = await photos.findOne({ id })
    if (!photo || photo.deletedAt) return reply.code(404).send({ error: 'unknown' })

    const files = (await listPhotoFiles(id)).filter(
      (f) => !f.endsWith('.sha256') && f !== 'formate.json',
    )
    if (files.length === 0) return reply.code(404).send({ error: 'unknown' })

    reply.header('Content-Disposition', `attachment; filename="${id}.zip"`)
    reply.type('application/zip')
    const zip = spawn('zip', ['-0', '-j', '-q', '-', ...files], { cwd: photoDir(id) })
    zip.on('error', (e) => request.log.error({ err: e, id }, 'cannot make the zip'))
    return reply.send(zip.stdout)
  })

  app.post<{ Params: { id: string }; Body: { code?: string } }>(
    '/foto/:id/loeschen',
    async (request, reply) => {
      noIndex(reply)
      const id = normalizePhotoId(request.params.id)
      const code = String(request.body?.code ?? '')
        .toUpperCase()
        .replace(/\s+/g, '')

      if (!isWellFormedId(id)) return reply.code(404).type('text/html').send(renderNotFound())

      const photo = await photos.findOne({ id })
      if (!photo) return reply.code(404).type('text/html').send(renderNotFound())
      if (photo.deletedAt) return reply.type('text/html').send(renderDeletedPage())

      /* MUSTER's deletion code is published for exhibitors to test the
         validation API against, so the demo photo refuses the deletion the
         code would otherwise buy. */
      if (id === 'MUSTER') {
        return reply
          .code(403)
          .type('text/html')
          .send(
            renderPhotoPage(id, await describePhotoFiles(id), photo.tables, {
              converting: converting(photo),
              problem: 'Das Musterfoto lässt sich nicht löschen.',
            }),
          )
      }

      if (tooManyAttempts(id)) {
        return reply
          .code(429)
          .type('text/html')
          .send(
            renderPhotoPage(id, await describePhotoFiles(id), photo.tables, {
              converting: converting(photo),
              problem: 'Zu viele Versuche. Bitte später noch einmal.',
            }),
          )
      }

      if (!isWellFormedCode(code) || !codeMatches(code, photo.codeHash)) {
        return reply
          .code(400)
          .type('text/html')
          .send(
            renderPhotoPage(id, await describePhotoFiles(id), photo.tables, {
              converting: converting(photo),
              problem:
                'Der Code stimmt nicht. Er steht auf dem Beleg unter „Foto wieder löschen?“.',
            }),
          )
      }

      /*
       * The files go first. If the row were marked and the removal then failed,
       * the page would say the photo was gone while it was still on disk — the
       * one way round that is worse than the other.
       */
      await removePhotoFiles(id)
      photo.deletedAt = new Date()
      await db.em.persistAndFlush(photo)
      request.log.info({ id }, 'visitor asked for their photo to be deleted')

      return reply.type('text/html').send(renderDeletedConfirmation())
    },
  )
}
