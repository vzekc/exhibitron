import { readFile, writeFile } from 'fs/promises'
import sharp from 'sharp'
import { buildReceiptSvg, rasteriseSvg, rgbaToGray, ditherAtkinson } from './receipt.js'
import { receiptPdf } from './pdf.js'

/*
 * The slip as it will be handed out, without a photo having to be taken:
 *
 *   npx tsx src/modules/visitorPhoto/receipt-preview.ts foto.jpg /tmp/beleg
 *
 * Writes .pdf and .png beside each other, which is the way to work on the
 * layout and its German. The ids are fixed so two runs can be compared.
 */
async function main() {
  const jpegPath = process.argv[2] ?? '../../fotofix/hans.jpg'
  const outBase = process.argv[3] ?? 'beleg'

  const svg = await buildReceiptSvg(
    await readFile(jpegPath),
    'K7M3PQ',
    'PQ4M7XKD',
    [3, 17, 24, 41, 58, 66, 79, 92, 103, 110],
    'https://2026.classic-computing.de/foto/',
  )
  const { pixels, width, height } = await rasteriseSvg(svg)
  const oneBpp = ditherAtkinson(rgbaToGray(pixels, width, height), width, height)

  await writeFile(`${outBase}.pdf`, receiptPdf(oneBpp, width, height))

  const rowBytes = Math.ceil(width / 8)
  const mono = Buffer.alloc(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ink = (oneBpp[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1
      mono[y * width + x] = ink ? 0 : 255
    }
  }
  await sharp(mono, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(`${outBase}.png`)

  console.log(`${width}x${height} dots → ${outBase}.pdf, ${outBase}.png`)
}

await main()
