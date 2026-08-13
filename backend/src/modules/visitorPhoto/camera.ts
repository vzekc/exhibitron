import * as path from 'path'
import { readdir, readFile, stat } from 'fs/promises'
import { fileURLToPath } from 'url'

/*
 * The Fotoautomat, in a browser.
 *
 * Not a web page in the booth's colours: the booth. The six screens are the
 * ones the Indy shows, copied from the fotofix repository by the sync script
 * there, and `screen.manifest` says where the picture, the countdown and the
 * photo ID are drawn on top of them — the same file the Indy reads, so the two
 * cannot drift apart. What the application blits, this page positions; nothing
 * here decides where anything goes.
 *
 * The exhibitor sees what a visitor sees, including the words about the printer
 * and the Ausstellungsnetz, because seeing that is the point. The slip that
 * would come out of the printer arrives as a PDF instead.
 *
 * The screen is only a screen: the buttons are underneath it, as they are on
 * the cabinet, and they are the box in buttonbox/ — a red one, a green one and
 * the language button, lit the way that box lights them.
 */

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const BOOTH_DIR = path.join(backendRoot, 'assets/booth')

/*
 * The faces the invitation shows in place of a viewfinder. They are put on the
 * machine rather than into the repository — a few hundred photographs of other
 * people, republished whenever more are converted — so this reads them from
 * where they were put. faces/publish.mjs in the fotofix repository makes them
 * and copies them across; BOOTH_SAMPLES_DIR points a development checkout at
 * its own copy.
 */
const SAMPLES_DIR = process.env.BOOTH_SAMPLES_DIR ?? '/var/lib/exhibitron/booth-samples'

/* The states the booth has, and the screen each one shows. `countdown` is not
   here: it is `live` with a digit over the viewfinder, which is what the booth
   does too. */
const SCREENS = ['attract', 'live', 'keep', 'printing', 'done', 'error'] as const

/*
 * A step is in the address, so that /foto/kamera/de/live is the screen the file
 * screens/de/live.html draws — the same two names in the same order. Reloading
 * comes back to the step you were on, and the address says which template to
 * open while you are editing it.
 */
export const isStep = (name: string) => (SCREENS as readonly string[]).includes(name)

export async function isLanguage(name: string) {
  return (await installedLanguages()).includes(name)
}

/*
 * The language the booth returns to by itself, and the one this page starts in.
 * Everything installed is offered; nothing here enumerates them, so a third
 * language is a directory in the fotofix repository and a run of its sync
 * script.
 */
const DEFAULT_LANGUAGE = 'de'

async function installedLanguages() {
  const entries = await readdir(BOOTH_DIR, { withFileTypes: true })
  const languages = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  if (languages.length === 0) throw new Error(`no language directory in ${BOOTH_DIR}`)

  /* German first, because that is the one the booth falls back to. */
  return languages.sort((a, b) =>
    a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : a.localeCompare(b),
  )
}

/* What the invitation can show, newest listing wins: publishing more faces is
   dropping files there, with nothing to restart. */
export async function sampleNames() {
  try {
    return (await readdir(SAMPLES_DIR)).filter((name) => name.endsWith('.png')).sort()
  } catch {
    return [] /* none published: the invitation shows an empty viewfinder */
  }
}

/* Read one by the name it was listed under, and by no other: the parameter
   comes from the address bar. */
export async function readSample(name: string) {
  if (!(await sampleNames()).includes(name)) return null
  return readFile(path.join(SAMPLES_DIR, name))
}

export const CAMERA_ASSETS = ['booth.css', 'camera.css', 'camera.js'] as const

export type CameraAsset = (typeof CAMERA_ASSETS)[number]

const TYPES: Record<CameraAsset, string> = {
  'booth.css': 'text/css; charset=utf-8',
  'camera.css': 'text/css; charset=utf-8',
  'camera.js': 'text/javascript; charset=utf-8',
}

export const isCameraAsset = (name: string): name is CameraAsset =>
  (CAMERA_ASSETS as readonly string[]).includes(name)

export const cameraAssetType = (name: CameraAsset) => TYPES[name]

/* ── holding on to what was read ─────────────────────────────────────────── */

/*
 * The screens, the stylesheets and the script do not change while the server is
 * running — except when they do, because an edit to one of them should show on
 * the next reload rather than after a restart.
 *
 * So each is kept in memory under the moment it was last written, and a request
 * costs a stat instead of a read: the same file gives the same answer, a changed
 * one is read again. When the stat itself fails, the last good copy is served
 * rather than an error — a deployment replaces these files underneath a running
 * process, and the few seconds in which one of them is missing or moved should
 * not be a broken page.
 */
type Cached<T> = { stamp: string; value: T }

async function stamp(files: string[]) {
  const stats = await Promise.all(files.map((file) => stat(file)))
  return stats.map((s) => Math.round(s.mtimeMs)).join(':')
}

async function cached<T>(
  slot: { current?: Cached<T> },
  files: string[],
  build: () => Promise<T>,
): Promise<T> {
  const now = await stamp(files).catch(() => null)
  if (now !== null && slot.current?.stamp === now) return slot.current.value

  const value = await build().catch((err) => {
    if (slot.current) return slot.current.value
    throw err
  })
  /* Stamped with what was on disk before the read, so a file changed mid-read
     is noticed next time rather than cached as if it had been seen. */
  if (now !== null) slot.current = { stamp: now, value }
  return value
}

const assetSlots = new Map<CameraAsset, { current?: Cached<Buffer> }>()

export function readCameraAsset(name: CameraAsset) {
  const file = path.join(BOOTH_DIR, name)
  let slot = assetSlots.get(name)
  if (!slot) assetSlots.set(name, (slot = {}))
  return cached(slot, [file], () => readFile(file))
}

/*
 * The manifest's rectangles: `name = x,y,width,height`. The lines naming which
 * screen carries which rectangle are the Indy's business — it has to check that
 * a blit area is clear before it draws there — and are skipped.
 */
function parseManifest(text: string) {
  const rects = new Map<string, number[]>()
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(\w+)\s*=\s*([\d,\s]+)$/)
    if (match)
      rects.set(
        match[1],
        match[2].split(',').map((n) => Number(n.trim())),
      )
  }
  for (const name of ['viewfinder', 'countdown', 'id_slot']) {
    const rect = rects.get(name)
    if (!rect || rect.length !== 4 || rect.some(Number.isNaN)) {
      throw new Error(`screen.manifest has no usable ${name} rectangle`)
    }
  }
  return rects as Map<string, [number, number, number, number]>
}

/* A screen is a document fragment with a preamble that belongs to the page, not
   to the screen. */
const screenBody = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<link[^>]*>/gi, '')
    .trim()

/* The assets may be cached, so their addresses carry the moment they were last
   written: an edit is on the next reload rather than five minutes later. */
async function version(name: CameraAsset) {
  const { mtimeMs } = await stat(path.join(BOOTH_DIR, name))
  return `/foto/kamera/${name}?v=${Math.round(mtimeMs)}`
}

/*
 * Everything the page is built from. The directory itself is in the list
 * because its own timestamp is what changes when a language is added or taken
 * away, which no file inside it would show.
 */
async function pageInputs(languages: string[]) {
  return [
    BOOTH_DIR,
    SAMPLES_DIR,
    path.join(BOOTH_DIR, 'screen.manifest'),
    ...CAMERA_ASSETS.map((name) => path.join(BOOTH_DIR, name)),
    ...languages.flatMap((lang) =>
      SCREENS.map((name) => path.join(BOOTH_DIR, lang, `${name}.html`)),
    ),
  ]
}

const pageSlot: { current?: Cached<string> } = {}

/*
 * What the page is built from, as one string. The page asks for it while it is
 * being worked on and reloads itself when it changes, which is what makes a
 * saved screen appear without touching the browser.
 */
export async function cameraStamp() {
  return stamp(await pageInputs(await installedLanguages()))
}

/* How long a question about the screens is held before being answered with the
   same answer, and how closely they are watched while it is held. */
const HOLD_MS = 20_000
const LOOK_EVERY_MS = 200

/*
 * The same, but answered only once it differs from what the asker already has.
 *
 * Asking once a second instead would be a request per second per open tab, and
 * every request here opens a database transaction — enough of them to starve
 * the ones that need it, which is how a slip once took thirty-five seconds to
 * render. Holding the question answers sooner and asks sixty times less often.
 */
export async function stampAfter(since: string | undefined, gone: () => boolean) {
  const deadline = Date.now() + HOLD_MS
  let current = await cameraStamp()

  while (since && current === since && Date.now() < deadline && !gone()) {
    await new Promise((resolve) => setTimeout(resolve, LOOK_EVERY_MS))
    current = await cameraStamp()
  }
  return current
}

/*
 * Reloading on its own belongs to whoever is editing the screens, not to an
 * exhibitor trying the booth out: in production the page is served without it
 * and asks the server nothing.
 */
const WATCHING = process.env.NODE_ENV !== 'production'

export async function renderCameraPage() {
  const languages = await installedLanguages().catch(() => {
    if (pageSlot.current) return null
    throw new Error(`no language directory in ${BOOTH_DIR}`)
  })
  if (languages === null) return pageSlot.current!.value

  return cached(pageSlot, await pageInputs(languages), () => buildCameraPage(languages))
}

const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

async function buildCameraPage(languages: string[]) {
  const [manifestText, booth, camera, script, samples] = await Promise.all([
    readFile(path.join(BOOTH_DIR, 'screen.manifest'), 'utf8'),
    version('booth.css'),
    version('camera.css'),
    version('camera.js'),
    sampleNames(),
  ])

  const rects = parseManifest(manifestText)
  const [vfX, vfY, vfW, vfH] = rects.get('viewfinder')!
  const [cdX, cdY, cdW, cdH] = rects.get('countdown')!
  const [idX, idY, idW, idH] = rects.get('id_slot')!

  const screens = await Promise.all(
    languages.flatMap((lang) =>
      SCREENS.map(async (name) => {
        const html = await readFile(path.join(BOOTH_DIR, lang, `${name}.html`), 'utf8')
        return `<section class="screen" data-state="${name}" data-lang="${lang}">${screenBody(html)}</section>`
      }),
    ),
  )
  const sections = screens.join('\n')

  /*
   * What the application draws over a screen, at the coordinates it draws them.
   * The video is mirrored so that posing works; the frame that is uploaded is
   * not, so lettering in the room reads correctly on the slip.
   */
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>FotoFix</title>
<link rel="stylesheet" href="${booth}">
<link rel="stylesheet" href="${camera}">
<style>
  .blit.viewfinder-area { left: ${vfX}px; top: ${vfY}px; width: ${vfW}px; height: ${vfH}px }
  .blit.countdown-area  { left: ${cdX}px; top: ${cdY}px; width: ${cdW}px; height: ${cdH}px }
  .blit.id-area         { left: ${idX}px; top: ${idY}px; width: ${idW}px; height: ${idH}px }
</style>
</head>
<body>
<div class="booth">
<div class="stage">
${sections}

<div class="blit viewfinder-area" id="picture" data-samples="${attribute(JSON.stringify(samples))}">
  <video id="viewfinder" playsinline autoplay muted></video>
  <canvas id="frozen" width="${vfW}" height="${vfH}"></canvas>
  <img id="sample" alt="" hidden>
</div>

<div class="blit countdown-area sheet" id="countdown" hidden>
  <div class="cell digit"><div class="plate"></div></div>
</div>

<div class="blit id-area sheet" id="photo-id" hidden></div>
</div>

<div class="controls">
  <div class="buttonbox">
    <button type="button" class="box-button" data-command="SHOOT" aria-label="Rote Taste">
      <span class="cap red"></span>
    </button>
    <button type="button" class="box-button" data-command="SAVE" aria-label="Grüne Taste">
      <span class="cap green"></span>
    </button>
    <button type="button" class="box-button" data-command="LANG" aria-label="Sprache">
      <span class="cap blue"></span>
    </button>
  </div>

  <p class="last-photo" id="last-photo" hidden>Letztes Foto: <a href="/foto/"></a></p>
</div>
</div>
<script type="module" src="${script}"${WATCHING ? ' data-watch="1"' : ''}></script>
</body>
</html>`
}
