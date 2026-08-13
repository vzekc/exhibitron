import * as fs from 'fs/promises'
import * as path from 'path'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/*
 * Where the pictures live: one directory per visitor, outside the database and
 * outside the backup, so that deleting one is complete the moment it returns.
 *
 * The directory name is the photo id, and every file inside says which machine
 * it is for — c64.prg, amiga-ham.adf, photo.jpg. Nothing repeats the id.
 */

/*
 * Where the pictures go. The server owns a directory of its own for them,
 * outside the backup; a development machine has no such directory and no right
 * to make one, so it keeps them beside the code instead. Without that split,
 * taking a photo locally fails on a permission error at the first mkdir.
 */
export const PHOTO_ROOT =
  process.env.VISITOR_PHOTO_ROOT ??
  (process.env.NODE_ENV === 'production' ? '/var/lib/exhibitron/visitor-photos' : 'visitor-photos')

/* Ids and codes are drawn from an alphabet with no 0/O or 1/I in it. */
const CODE = /^[A-HJ-NP-Z2-9]+$/

export function isWellFormedId(id: string) {
  return id.length === 6 && CODE.test(id)
}

export function isWellFormedCode(code: string) {
  return code.length >= 6 && code.length <= 16 && CODE.test(code)
}

export function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

/*
 * Ids and codes as the booth mints them, for a photo that did not come from the
 * booth. Both are drawn from the crypto source: an id is not a secret, but a
 * guessable one would let somebody walk the ids and find other people's photos,
 * and the deletion code is the only thing standing between a stranger and
 * somebody else's picture.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const draw = (length: number) =>
  Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('')

export const generatePhotoId = () => draw(6)

export const generateDeleteCode = () => draw(8)

/* Compared without leaking, through timing, how much of a guess was right. */
export function codeMatches(code: string, expectedHash: string) {
  const got = Buffer.from(hashCode(code), 'hex')
  const want = Buffer.from(expectedHash, 'hex')
  return got.length === want.length && timingSafeEqual(got, want)
}

export function photoDir(id: string) {
  if (!isWellFormedId(id)) {
    throw new Error(`refusing to build a path from ${JSON.stringify(id)}`)
  }
  return path.join(PHOTO_ROOT, id)
}

export async function writePhotoFile(id: string, name: string, data: Buffer) {
  const dir = photoDir(id)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, path.basename(name)), data)
}

export async function listPhotoFiles(id: string): Promise<string[]> {
  const entries = await fs.readdir(photoDir(id)).catch(() => [])
  return entries.filter((name) => !name.startsWith('.')).sort()
}

export async function readPhotoFile(id: string, name: string) {
  return fs.readFile(path.join(photoDir(id), path.basename(name)))
}

/* Everything the visitor's photo produced, gone. */
export async function removePhotoFiles(id: string) {
  await fs.rm(photoDir(id), { recursive: true, force: true })
}

/*
 * The downloads, in the order a visitor would look for them: the picture in
 * formats any machine of today reads, then one line per machine of the
 * exhibition. A file that matches no group is still offered — a new encoder
 * should appear on the page the day it is added, not the day somebody
 * remembers to edit this list.
 */
const GROUPS: { title: string; match: RegExp }[] = [
  { title: 'Bildformate', match: /^(photo\.jpg|png|pcx|gif|bmp|ppm|pgm|pbm|xbm|tiff)/ },
  { title: 'C64', match: /^c64/ },
  { title: 'Amiga', match: /^amiga/ },
  { title: 'Apple', match: /^apple2/ },
  { title: 'Atari', match: /^atari/ },
  { title: 'MSX', match: /^msx/ },
  { title: 'Amstrad', match: /^cpc/ },
  { title: 'Texas Instruments', match: /^ti99/ },
  { title: 'PC', match: /^(cga|mga|vga)/ },
  { title: 'Terminals', match: /^(ascii-terminal|tektronix|vt24)/ },
  { title: 'Drucker', match: /^ascii-print/ },
  { title: 'Der Beleg', match: /^beleg\.png$/ },
]

export function groupFiles(files: string[]) {
  const shown = files.filter((f) => !f.endsWith('.sha256'))
  const groups = GROUPS.map(({ title, match }) => ({
    title,
    files: shown.filter((f) => match.test(f)),
  })).filter((g) => g.files.length > 0)

  const claimed = new Set(groups.flatMap((g) => g.files))
  const rest = shown.filter((f) => !claimed.has(f))
  if (rest.length > 0) {
    groups.push({ title: 'Weitere Formate', files: rest })
  }
  return groups
}
