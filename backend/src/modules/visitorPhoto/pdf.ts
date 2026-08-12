import { deflateSync } from 'zlib'

/*
 * The receipt as a PDF: one page, one image, nothing else.
 *
 * What goes in is the same 1-bit raster the thermal printer receives, so the
 * page is the slip at its true size — 576 dots at 180 dpi is 72 mm across —
 * and printing it at 100 % gives back a piece of paper the width of the ones
 * coming out of the booth.
 *
 * A PDF this simple is shorter to write than to configure a library for: five
 * objects, a cross-reference table of their offsets, and a trailer.
 */

const DPI = 180
const POINTS_PER_INCH = 72

/*
 * `oneBpp` is what ditherAtkinson produced: rows padded to whole bytes, a set
 * bit meaning ink. PDF reads 1-bit DeviceGray the other way round — 0 is black
 * — so the image is given a Decode array that swaps the two rather than the
 * buffer being inverted here.
 */
export function receiptPdf(oneBpp: Buffer, width: number, height: number): Buffer {
  const pageW = ((width / DPI) * POINTS_PER_INCH).toFixed(2)
  const pageH = ((height / DPI) * POINTS_PER_INCH).toFixed(2)
  const image = deflateSync(oneBpp, { level: 9 })
  const content = Buffer.from(`q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`, 'latin1')

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}]` +
      ` /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    {
      dict:
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height}` +
        ` /ColorSpace /DeviceGray /BitsPerComponent 1 /Decode [1 0]` +
        ` /Filter /FlateDecode /Length ${image.length} >>`,
      stream: image,
    },
    { dict: `<< /Length ${content.length} >>`, stream: content },
  ]

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')]
  const offsets: number[] = []
  let at = parts[0].length

  objects.forEach((object, i) => {
    const dict = typeof object === 'string' ? object : object.dict
    const head = Buffer.from(`${i + 1} 0 obj\n${dict}\n`, 'latin1')
    const body =
      typeof object === 'string'
        ? Buffer.alloc(0)
        : Buffer.concat([
            Buffer.from('stream\n', 'latin1'),
            object.stream,
            Buffer.from('\nendstream\n', 'latin1'),
          ])
    const tail = Buffer.from('endobj\n', 'latin1')

    offsets.push(at)
    for (const part of [head, body, tail]) {
      parts.push(part)
      at += part.length
    }
  })

  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`),
  ].join('')
  parts.push(
    Buffer.from(
      `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF\n`,
      'latin1',
    ),
  )

  return Buffer.concat(parts)
}
