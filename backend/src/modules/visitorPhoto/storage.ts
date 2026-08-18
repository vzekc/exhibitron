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

/*
 * The id as the booth mints it, whatever case it arrived in.
 *
 * The six characters are printed on the slip in capitals and typed back in by
 * hand — into a phone that offers a small letter first, into a machine of the
 * exhibition whose keyboard has an opinion of its own. All of those name the
 * same photo, so the case of an address says nothing and every id is brought
 * to the one form the directories and the rows are written in.
 */
export const normalizePhotoId = (id: string) => id.toUpperCase()

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
  { title: 'Terminals', match: /^(ascii-terminal|ascii-tono|tektronix|vt24|minitel|btx)/ },
  { title: 'Drucker', match: /^(ascii-print|nec-p6)/ },
  { title: 'Der Beleg', match: /^beleg\.png$/ },
]

/* One download: the file, and the line that says what it is. */
export type DescribedFile = { name: string; text: string }
export type FileGroup = { title: string; files: DescribedFile[] }

/*
 * The listing the conversion wrote beside the files, and the page it wrote for
 * the file servers: both are plumbing rather than downloads, so neither is
 * offered here.
 */
const MANIFEST = 'formate.json'
const NOT_A_DOWNLOAD = new Set([MANIFEST, 'index.html'])

type Manifest = { id?: string; dateien?: { name: string; system: string; text: string }[] }

/*
 * What each file is, as the converter said it: `formate.json` carries the
 * machine every file belongs to and one line of German describing it. It is
 * written by whatever made the files, so a format added to the converter
 * describes itself here the day it is added, without this page knowing of it.
 */
async function readManifest(id: string): Promise<Manifest['dateien']> {
  const raw = await fs.readFile(path.join(photoDir(id), MANIFEST), 'utf8').catch(() => null)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Manifest
    return Array.isArray(parsed.dateien) ? parsed.dateien : undefined
  } catch {
    return undefined
  }
}

/* The files this photo has, grouped by machine and each with its line. */
export async function describePhotoFiles(id: string): Promise<FileGroup[]> {
  const present = new Set(
    (await listPhotoFiles(id)).filter((f) => !f.endsWith('.sha256') && !NOT_A_DOWNLOAD.has(f)),
  )
  const groups: FileGroup[] = []
  const put = (title: string, file: DescribedFile) => {
    const group = groups.find((g) => g.title === title)
    if (group) group.files.push(file)
    else groups.push({ title, files: [file] })
  }

  /* First what the manifest knows, in the order it lists it. */
  for (const entry of (await readManifest(id)) ?? []) {
    if (!present.has(entry.name)) continue
    present.delete(entry.name)
    put(entry.system, { name: entry.name, text: entry.text })
  }

  /*
   * Then the rest: the receipt, which the website makes rather than the
   * converter, and — for a photo converted before there was a manifest — every
   * format, grouped by its name alone and with nothing to say about itself.
   */
  const rest = [...present].sort()
  for (const { title, match } of GROUPS) {
    for (const name of rest.filter((n) => present.has(n) && match.test(n))) {
      present.delete(name)
      put(title, { name, text: '' })
    }
  }
  for (const name of rest.filter((n) => present.has(n))) {
    put('Weitere Formate', { name, text: '' })
  }

  return groups
}
