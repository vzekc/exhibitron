import * as path from 'path'
import { readFile, stat } from 'fs/promises'
import { fileURLToPath } from 'url'

/*
 * The camera page: the booth, for an exhibitor who wants to see what it does
 * without standing in front of it.
 *
 * The look is not rebuilt here. `booth.css` is the stylesheet the Indy's own
 * screens are designed in, copied across by the sync script in the fotofix
 * repository, and everything on the page is built from the classes it already
 * defines. What is added is what a browser needs and a booth does not: a video
 * element where the blit goes, buttons where the lamps are, and a stage that
 * can be scaled to something other than 1280x1024.
 */

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const BOOTH_DIR = path.join(backendRoot, 'assets/booth')

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
 * The screens are one file of markup with a section per state, and the page is
 * that file inside a document. Nothing is templated: everything the page shows
 * about a particular photo arrives after it has been taken.
 */
/*
 * The assets may be cached, so their addresses carry the moment they were last
 * written: an edit to the stylesheet is on the next reload rather than five
 * minutes later, which is the difference between working on this and guessing
 * whether the browser has caught up.
 */
async function version(name: CameraAsset) {
  const { mtimeMs } = await stat(path.join(BOOTH_DIR, name))
  return `/foto/kamera/${name}?v=${Math.round(mtimeMs)}`
}

export async function renderCameraPage() {
  const [screens, booth, camera, script] = await Promise.all([
    readFile(path.join(BOOTH_DIR, 'camera.html'), 'utf8'),
    version('booth.css'),
    version('camera.css'),
    version('camera.js'),
  ])

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>FotoFix — Kamera</title>
<link rel="stylesheet" href="${booth}">
<link rel="stylesheet" href="${camera}">
</head>
<body>
${screens}
<script type="module" src="${script}"></script>
</body>
</html>`
}
