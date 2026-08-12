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

/* The states the booth has, and the screen each one shows. `countdown` is not
   here: it is `live` with a digit over the viewfinder, which is what the booth
   does too. */
const SCREENS = ['attract', 'live', 'keep', 'printing', 'done', 'error'] as const

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

export const readCameraAsset = (name: CameraAsset) => readFile(path.join(BOOTH_DIR, name))

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

export async function renderCameraPage() {
  const languages = await installedLanguages()
  const [manifestText, booth, camera, script] = await Promise.all([
    readFile(path.join(BOOTH_DIR, 'screen.manifest'), 'utf8'),
    version('booth.css'),
    version('camera.css'),
    version('camera.js'),
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

<div class="blit viewfinder-area" id="picture">
  <video id="viewfinder" playsinline autoplay muted></video>
  <canvas id="frozen" width="${vfW}" height="${vfH}"></canvas>
</div>

<div class="blit countdown-area sheet" id="countdown" hidden>
  <div class="cell digit"><div class="plate"></div></div>
</div>

<div class="blit id-area sheet" id="photo-id" hidden></div>
</div>

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
</div>
<script type="module" src="${script}"></script>
</body>
</html>`
}
