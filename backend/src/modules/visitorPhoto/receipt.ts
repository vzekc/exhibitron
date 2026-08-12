import * as path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { Resvg } from '@resvg/resvg-js'

/*
 * The visitor's slip, for a photo that has no printer in front of it.
 *
 * The booth's Laufzettel comes out of a thermal printer at 576 dots across; a
 * photo taken on the camera page gets the same slip as a PDF, down to the
 * Atkinson dithering, so that the two are recognisably one thing when they are
 * lying next to each other on a table.
 *
 * The layout is the one in the fotofix repository, `print/src/print-demo.ts`.
 * The two are separate copies on purpose — the printer half needs an ESC/POS
 * stream and a machine with the printer attached — and they have to be changed
 * together, or a visitor and an exhibitor end up holding different slips.
 */

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const FONT_DIR = path.join(backendRoot, 'assets/fonts')

/* 72 mm at 180 dpi: the paper the booth prints on. */
export const PRINT_WIDTH = 576

/* The receipt is set in IBM Plex Sans, shipped with the backend so that it
   renders the same here as it does on the machine driving the printer. */
const FONT = 'IBM Plex Sans'

async function jpegToPngBase64(jpeg: Buffer) {
  const png = await sharp(jpeg)
    .resize(PRINT_WIDTH, null, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer()
  const meta = await sharp(png).metadata()
  return { b64: png.toString('base64'), width: meta.width!, height: meta.height! }
}

async function qrToPngBase64(text: string) {
  /* ~0.85 mm per module at 180 dpi, which scans reliably off thermal paper. */
  const png = (await QRCode.toBuffer(text, {
    type: 'png',
    scale: 6,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })) as Buffer
  const meta = await sharp(png).metadata()
  return { b64: png.toString('base64'), size: meta.width! }
}

export async function buildReceiptSvg(
  jpeg: Buffer,
  photoId: string,
  deleteCode: string,
  tables: number[],
  photoUrlBase: string,
): Promise<string> {
  const [photo, qr] = await Promise.all([
    jpegToPngBase64(jpeg),
    qrToPngBase64(photoUrlBase + photoId),
  ])

  /* Layout constants, in px, which are dots at 180 dpi. */
  const PAD = 16
  const headerH = 116
  const dividerH = 4
  const photoH = photo.height
  const urlGap = 14
  const urlLineH = 24
  const qrSectionH = PAD + qr.size + urlGap + urlLineH + PAD
  const deleteSectionH = 112
  const footerH = 40

  /* The stamp grid: two columns of boxes, one for every participating table, so
     the slip is as long as the trail is. A visitor who cannot collect every
     stamp is holding the wrong slip. */
  const boxCols = 2
  const boxGap = 12
  const boxRowGap = 12
  const boxW = Math.floor((PRINT_WIDTH - 2 * PAD - boxGap * (boxCols - 1)) / boxCols)
  const boxH = 96
  const headingH = 52
  const boxRows = Math.ceil(tables.length / boxCols)
  const tablesSectionH =
    tables.length > 0 ? headingH + boxRows * boxH + (boxRows - 1) * boxRowGap + 10 : 0

  const totalH =
    headerH +
    dividerH +
    photoH +
    dividerH +
    qrSectionH +
    dividerH +
    deleteSectionH +
    dividerH +
    tablesSectionH +
    footerH

  let y = 0
  const headerY = y
  y += headerH
  const divider1Y = y
  y += dividerH

  const photoY = y
  y += photoH
  const divider2Y = y
  y += dividerH

  const qrBlockY = y
  y += qrSectionH
  const divider4Y = y
  y += dividerH

  /*
   * The deletion code, in the one place it exists. It is not stored anywhere,
   * so whoever holds this slip can have the photo removed and nobody else can.
   */
  const deleteY = y
  y += deleteSectionH
  const divider5Y = y
  y += dividerH

  const tablesY = y
  y += tablesSectionH
  const footerY = y

  /* The photo id beside the QR code: caption and a big id, the pair centred
     against the QR, and the id as large as the column and the QR's height
     allow. */
  const qrGap = 24
  const idX = PAD + qr.size + qrGap
  const idRegionW = PRINT_WIDTH - PAD - idX
  const idCenterX = idX + idRegionW / 2
  const idCaptionFont = 28
  const idCapGap = 8
  const idFont = Math.min(
    Math.floor(idRegionW / (photoId.length * 0.66)),
    Math.floor((qr.size - idCaptionFont - idCapGap) / 0.78),
    104,
  )
  const idCapHeight = idFont * 0.72
  const idGroupH = idCaptionFont + idCapGap + idCapHeight
  const idGroupTop = qrBlockY + PAD + (qr.size - idGroupH) / 2
  const idCaptionBaselineY = idGroupTop + idCaptionFont
  const idBaselineY = idGroupTop + idCaptionFont + idCapGap + idCapHeight

  /* Each box carries its table number in the corner and leaves the rest empty,
     for the table to stamp or sign as the visitor collects it. */
  const gridTopY = tablesY + headingH
  const boxesSvg = tables
    .map((n, i) => {
      const col = i % boxCols
      const row = Math.floor(i / boxCols)
      const bx = PAD + col * (boxW + boxGap)
      const by = gridTopY + row * (boxH + boxRowGap)
      return `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" rx="8"
      fill="white" stroke="black" stroke-width="3"/>
  <text x="${bx + 16}" y="${by + 52}"
    font-family="${FONT}" font-size="48" font-weight="bold"
    fill="black">${n}</text>`
    })
    .join('\n  ')

  const tablesHeading =
    tables.length > 0
      ? `<text x="${PAD}" y="${tablesY + 32}"
    font-family="${FONT}" font-size="23" font-weight="bold"
    fill="black">Besuche diese Tische, um dein Foto zu sehen:</text>`
      : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PRINT_WIDTH}" height="${totalH}">
  <rect width="${PRINT_WIDTH}" height="${totalH}" fill="white"/>

  <text x="${PRINT_WIDTH / 2}" y="${headerY + 56}"
    textLength="${PRINT_WIDTH - 2 * PAD}" lengthAdjust="spacingAndGlyphs"
    font-family="${FONT}" font-size="48" font-weight="bold"
    text-anchor="middle" fill="black">Classic Computing 2026 Celle</text>
  <text x="${PRINT_WIDTH / 2}" y="${headerY + 102}"
    font-family="${FONT}" font-size="34" font-weight="bold"
    text-anchor="middle" fill="black">Laufzettel</text>

  <rect x="0" y="${divider1Y + 1}" width="${PRINT_WIDTH}" height="2" fill="black"/>

  <image x="0" y="${photoY}" width="${photo.width}" height="${photo.height}"
    href="data:image/png;base64,${photo.b64}"/>

  <rect x="0" y="${divider2Y + 1}" width="${PRINT_WIDTH}" height="2" fill="black"/>

  <image x="${PAD}" y="${qrBlockY + PAD}" width="${qr.size}" height="${qr.size}"
    href="data:image/png;base64,${qr.b64}"/>
  <text x="${idCenterX}" y="${idCaptionBaselineY}"
    font-family="${FONT}" font-size="${idCaptionFont}"
    text-anchor="middle" fill="black">FOTO-ID</text>
  <text x="${idCenterX}" y="${idBaselineY}"
    font-family="${FONT}" font-size="${idFont}" font-weight="bold"
    text-anchor="middle" fill="black">${photoId}</text>
  <text x="${PRINT_WIDTH / 2}" y="${qrBlockY + PAD + qr.size + urlGap + 18}"
    font-family="${FONT}" font-size="20"
    text-anchor="middle" fill="black">${photoUrlBase}${photoId}</text>

  <rect x="0" y="${divider4Y + 1}" width="${PRINT_WIDTH}" height="2" fill="black"/>

  <text x="${PAD}" y="${deleteY + 30}"
    font-family="${FONT}" font-size="23" font-weight="bold"
    fill="black">Foto wieder löschen?</text>
  <text x="${PAD}" y="${deleteY + 58}"
    font-family="${FONT}" font-size="20"
    fill="black">Auf der Webseite oben mit diesem Code:</text>
  <rect x="${PAD}" y="${deleteY + 68}" width="${PRINT_WIDTH - 2 * PAD}" height="38"
    fill="none" stroke="black" stroke-width="2"/>
  <text x="${PRINT_WIDTH / 2}" y="${deleteY + 96}"
    font-family="${FONT}" font-size="30" font-weight="bold" letter-spacing="6"
    text-anchor="middle" fill="black">${deleteCode}</text>

  <rect x="0" y="${divider5Y + 1}" width="${PRINT_WIDTH}" height="2" fill="black"/>

  ${tablesHeading}
  ${boxesSvg}

  <text x="${PRINT_WIDTH / 2}" y="${footerY + 28}"
    font-family="${FONT}" font-size="18"
    text-anchor="middle" fill="black">* * *</text>
</svg>`
}

/* ── the raster, and the dither the printer would apply ───────────────────── */

let fontFiles: string[] | undefined

async function receiptFonts() {
  if (!fontFiles) {
    const names = ['IBMPlexSans-Regular.ttf', 'IBMPlexSans-Bold.ttf']
    /* Read once, so a missing font is a startup-shaped error rather than a
       receipt that quietly comes out in whatever resvg found instead. */
    await Promise.all(names.map((name) => readFile(path.join(FONT_DIR, name))))
    fontFiles = names.map((name) => path.join(FONT_DIR, name))
  }
  return fontFiles
}

export async function rasteriseSvg(svg: string) {
  const rendered = new Resvg(svg, {
    fitTo: { mode: 'width', value: PRINT_WIDTH },
    font: {
      loadSystemFonts: false,
      fontFiles: await receiptFonts(),
      defaultFontFamily: FONT,
    },
  }).render()
  return { pixels: rendered.pixels, width: rendered.width, height: rendered.height }
}

export function rgbaToGray(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const alpha = rgba[i * 4 + 3] / 255
    const r = rgba[i * 4] * alpha + 255 * (1 - alpha)
    const g = rgba[i * 4 + 1] * alpha + 255 * (1 - alpha)
    const b = rgba[i * 4 + 2] * alpha + 255 * (1 - alpha)
    gray[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
  }
  return gray
}

/*
 * Atkinson, because it is what the thermal printer's output was tuned for: it
 * spreads three quarters of the error and lets the rest fall away, which keeps
 * white white on paper that spreads ink of its own accord.
 *
 * One bit per dot, a set bit meaning ink, rows padded to whole bytes.
 */
export function ditherAtkinson(gray: Uint8Array, width: number, height: number): Buffer {
  const buf = new Float32Array(gray)
  const rowBytes = Math.ceil(width / 8)
  const out = Buffer.alloc(height * rowBytes, 0)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const old = buf[idx]
      const nw = old < 128 ? 0 : 255
      buf[idx] = nw
      const err = (old - nw) / 8
      const neighbours: [number, number][] = [
        [y, x + 1],
        [y, x + 2],
        [y + 1, x - 1],
        [y + 1, x],
        [y + 1, x + 1],
        [y + 2, x],
      ]
      for (const [ny, nx] of neighbours) {
        if (ny < height && nx >= 0 && nx < width) buf[ny * width + nx] += err
      }
      if (nw === 0) out[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7)
    }
  }
  return out
}
