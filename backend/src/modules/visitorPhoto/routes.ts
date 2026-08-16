import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
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
  groupFiles,
  hashCode,
  isWellFormedCode,
  isWellFormedId,
  listPhotoFiles,
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

    const { id } = request.params
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

    const { id } = request.params
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

      const { id, name } = request.params
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

      const { id } = request.params
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
      const { id } = request.params
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
    const { id } = request.params
    if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

    const photo = await photos.findOne({ id })
    if (!photo) return reply.code(404).send({ error: 'unknown' })
    if (photo.deletedAt) return reply.send({ id, deleted: true })

    const files = await listPhotoFiles(id)
    return reply.send({
      id,
      deleted: false,
      converting: !!converting(photo),
      groups: groupFiles(files),
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
      const { id } = request.params
      const code = String(request.body?.code ?? '')
        .toUpperCase()
        .replace(/\s+/g, '')

      if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

      const photo = await photos.findOne({ id })
      if (!photo) return reply.code(404).send({ error: 'unknown' })
      if (photo.deletedAt) return reply.send({ deleted: true })

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
    const { id } = request.params
    if (isWellFormedId(id) && isModernBrowser(request)) {
      return reply.type('text/html').sendFile('index.html')
    }
    if (!isWellFormedId(id)) return reply.code(404).type('text/html').send(renderNotFound())

    const photo = await photos.findOne({ id })
    if (!photo) return reply.code(404).type('text/html').send(renderNotFound())
    if (photo.deletedAt) return reply.type('text/html').send(renderDeletedPage())

    const files = await listPhotoFiles(id)
    return reply
      .type('text/html')
      .send(renderPhotoPage(id, groupFiles(files), photo.tables, { converting: converting(photo) }))
  })

  app.get<{ Params: { id: string; file: string } }>(
    '/foto/:id/datei/:file',
    async (request, reply) => {
      noIndex(reply)
      const { id, file } = request.params
      if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

      const photo = await photos.findOne({ id })
      if (!photo || photo.deletedAt) return reply.code(404).send({ error: 'unknown' })

      const files = await listPhotoFiles(id)
      if (!files.includes(file)) return reply.code(404).send({ error: 'unknown' })

      reply.header('Content-Disposition', `attachment; filename="${id}-${file}"`)
      reply.type(file.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream')
      return readPhotoFile(id, file)
    },
  )

  /*
   * Everything in one file. The formats are already compressed binaries, so it
   * is stored rather than deflated — quicker, and no smaller either way.
   */
  app.get<{ Params: { id: string } }>('/foto/:id/alle-formate.zip', async (request, reply) => {
    noIndex(reply)
    const { id } = request.params
    if (!isWellFormedId(id)) return reply.code(404).send({ error: 'unknown' })

    const photo = await photos.findOne({ id })
    if (!photo || photo.deletedAt) return reply.code(404).send({ error: 'unknown' })

    const files = (await listPhotoFiles(id)).filter((f) => !f.endsWith('.sha256'))
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
      const { id } = request.params
      const code = String(request.body?.code ?? '')
        .toUpperCase()
        .replace(/\s+/g, '')

      if (!isWellFormedId(id)) return reply.code(404).type('text/html').send(renderNotFound())

      const photo = await photos.findOne({ id })
      if (!photo) return reply.code(404).type('text/html').send(renderNotFound())
      if (photo.deletedAt) return reply.type('text/html').send(renderDeletedPage())

      if (tooManyAttempts(id)) {
        const files = await listPhotoFiles(id)
        return reply
          .code(429)
          .type('text/html')
          .send(
            renderPhotoPage(id, groupFiles(files), photo.tables, {
              converting: converting(photo),
              problem: 'Zu viele Versuche. Bitte später noch einmal.',
            }),
          )
      }

      if (!isWellFormedCode(code) || !codeMatches(code, photo.codeHash)) {
        const files = await listPhotoFiles(id)
        return reply
          .code(400)
          .type('text/html')
          .send(
            renderPhotoPage(id, groupFiles(files), photo.tables, {
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
