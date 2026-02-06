import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, readFile, unlink, readdir, stat, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const XSLT_PATH = join(__dirname, '../../../preprocess-odg-svg.xsl')
const TEMP_SVG_DIR = join(tmpdir(), 'exhibitron-seatplan')
const TEMP_SVG_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

function getLibreOfficePath(): string {
  if (process.platform === 'darwin') {
    return '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  }
  return 'libreoffice'
}

function getSaxonCommand(): string[] {
  if (process.platform === 'darwin') {
    return ['saxon']
  }
  return ['java', '-jar', '/usr/share/java/Saxon-HE-9.9.1.5.jar']
}

export async function convertOdgToSvg(odgBuffer: Buffer): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), 'exhibitron-odg-'))
  const odgPath = join(workDir, 'input.odg')

  await writeFile(odgPath, odgBuffer)

  // Step 1: Convert ODG to SVG with LibreOffice
  const soffice = getLibreOfficePath()
  try {
    await execFileAsync(soffice, [
      '--headless',
      '--convert-to',
      'svg',
      '--outdir',
      workDir,
      odgPath,
    ])
  } catch (err) {
    throw new Error(
      `LibreOffice-Konvertierung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const rawSvgPath = join(workDir, 'input.svg')

  // Check if raw SVG was created
  const rawSvgStat = await stat(rawSvgPath).catch(() => null)
  if (!rawSvgStat) {
    throw new Error(
      'LibreOffice konnte die Datei nicht in SVG konvertieren. Ist die Datei eine gültige ODG-Datei?',
    )
  }

  // Step 2: Run XSLT transform with Saxon
  const saxonCmd = getSaxonCommand()
  const processedSvgPath = join(workDir, 'processed.svg')

  const saxonArgs =
    saxonCmd.length === 1
      ? ['-s:' + rawSvgPath, '-xsl:' + XSLT_PATH, '-o:' + processedSvgPath]
      : [...saxonCmd.slice(1), '-s:' + rawSvgPath, '-xsl:' + XSLT_PATH, '-o:' + processedSvgPath]

  try {
    await execFileAsync(saxonCmd[0], saxonArgs)
  } catch (err) {
    throw new Error(
      `XSLT-Transformation fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  const processedSvgStat = await stat(processedSvgPath).catch(() => null)
  if (!processedSvgStat) {
    throw new Error('XSLT-Transformation hat keine Ausgabe erzeugt.')
  }

  const processedSvg = await readFile(processedSvgPath, 'utf-8')

  // Cleanup work directory
  const files = await readdir(workDir)
  for (const file of files) {
    await unlink(join(workDir, file)).catch(() => {})
  }
  await unlink(workDir).catch(() => {})

  return processedSvg
}

export function extractTableNumbers(svgContent: string): {
  tables: number[]
  duplicates: number[]
} {
  const regex = /id="table_(\d+)"/g
  const seen = new Set<number>()
  const duplicates = new Set<number>()
  let match
  while ((match = regex.exec(svgContent)) !== null) {
    const n = parseInt(match[1], 10)
    if (seen.has(n)) duplicates.add(n)
    seen.add(n)
  }
  return {
    tables: [...seen].sort((a, b) => a - b),
    duplicates: [...duplicates].sort((a, b) => a - b),
  }
}

async function ensureTempDir(): Promise<void> {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(TEMP_SVG_DIR, { recursive: true })
}

export async function storeTempSvg(svgContent: string): Promise<string> {
  await ensureTempDir()
  const token = randomUUID()
  const filePath = join(TEMP_SVG_DIR, `${token}.svg`)
  await writeFile(filePath, svgContent, 'utf-8')
  return token
}

export async function retrieveTempSvg(token: string): Promise<string> {
  // Validate token is a UUID to prevent path traversal
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)) {
    throw new Error('Invalid token')
  }
  const filePath = join(TEMP_SVG_DIR, `${token}.svg`)
  return readFile(filePath, 'utf-8')
}

export async function deleteTempSvg(token: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)) {
    return
  }
  const filePath = join(TEMP_SVG_DIR, `${token}.svg`)
  await unlink(filePath).catch(() => {})
}

export async function cleanupExpiredTempFiles(): Promise<void> {
  await ensureTempDir()
  const now = Date.now()
  const files = await readdir(TEMP_SVG_DIR)
  for (const file of files) {
    const filePath = join(TEMP_SVG_DIR, file)
    const fileStat = await stat(filePath).catch(() => null)
    if (fileStat && !fileStat.isDirectory() && now - fileStat.mtimeMs > TEMP_SVG_MAX_AGE_MS) {
      await unlink(filePath).catch(() => {})
    }
  }
}
