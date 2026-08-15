/*
 * The transcript a Kermit port shows, in the words the page is written in.
 *
 * One line per packet: which end sent it, what it is, and the part of it worth
 * reading — a file name, a size, the parameters two Kermits agreed on. Bytes
 * that belong to no packet get a line of their own, because that is where the
 * line settings and the cable are on trial.
 */

import {
  hex,
  type FileAttributes,
  type InitParams,
  type KermitEvent,
  type KermitPacket,
} from './kermit'

const NAMES: Record<string, string> = {
  S: 'Verbindungsaufbau',
  I: 'Serveranfrage',
  R: 'Dateianforderung',
  F: 'Dateikopf',
  X: 'Textkopf',
  A: 'Dateimerkmale',
  D: 'Daten',
  Z: 'Dateiende',
  B: 'Übertragungsende',
  Y: 'Bestätigung',
  N: 'Wiederholung',
  E: 'Fehler',
  G: 'Serverbefehl',
  C: 'Systembefehl',
  T: 'Zeitüberschreitung',
}

const COMMANDS: Record<string, string> = {
  F: 'beenden',
  L: 'abmelden',
  B: 'abmelden',
  C: 'Verzeichnis wechseln',
  D: 'Verzeichnis zeigen',
  U: 'Plattenplatz',
  E: 'löschen',
  T: 'anzeigen',
  H: 'Hilfe',
  Q: 'Zustand',
  W: 'wer',
  M: 'Nachricht',
  R: 'umbenennen',
  K: 'kopieren',
}

const LABELS = { machine: 'Gerät ', exhibition: 'Server' }

const PLAIN = '\x1b[0m'
const DIM = '\x1b[2m'
const COLOURS = { machine: '\x1b[36m', exhibition: '\x1b[32m' }
const WRONG = '\x1b[31m'
const ODD = '\x1b[33m'

/* The heading the mirror opens with, so the columns beneath it read. */
export function kermitOpening() {
  return [
    `${DIM}Kermit-Betrieb: der Datenstrom wird als Protokoll gelesen.${PLAIN}`,
    `${DIM}Absender · Pakettyp · Nummer · Bedeutung · Inhalt${PLAIN}`,
    '',
  ]
}

export function kermitLine(event: KermitEvent) {
  const colour = COLOURS[event.origin]
  const label = `${colour}${LABELS[event.origin]}${PLAIN}`

  if (event.kind === 'noise') {
    const bytes = event.bytes
    return (
      `${label} ${ODD}?${PLAIN}      ${'ohne Paket'.padEnd(18)}` +
      `${ODD}${bytes.length} Bytes${PLAIN} ${DIM}${shown(bytes)}${PLAIN}`
    )
  }

  const name = NAMES[event.type] ?? 'unbekannt'
  const seq = `#${event.seq}`.padEnd(5)
  const said = detail(event)
  const broken = event.checkOk ? '' : ` ${WRONG}Prüfsumme falsch${PLAIN}`
  const head = `${label} ${event.type} ${seq} ${said || broken ? name.padEnd(18) : name}`
  return `${head}${said ? `${DIM}${said}${PLAIN}` : ''}${broken}`
}

/* Printable runs read as themselves; anything else is worth seeing as bytes. */
function shown(bytes: Uint8Array) {
  let printable = 0
  for (const byte of bytes) if (byte === 0x09 || (byte >= 0x20 && byte < 0x7f)) printable += 1
  if (printable >= bytes.length * 0.8) {
    const text = String.fromCharCode(...bytes.subarray(0, 60)).replace(/[^\t\x20-\x7e]/g, '.')
    return `„${text}${bytes.length > 60 ? '…' : ''}“`
  }
  return hex(bytes, 12)
}

function detail(packet: KermitPacket) {
  if (packet.params) return settings(packet.params)
  if (packet.attributes) return merkmale(packet.attributes)
  if (packet.type === 'D') return `${packet.dataLength} Bytes`
  if (packet.type === 'G') {
    const command = COMMANDS[packet.text.slice(0, 1)] ?? packet.text.slice(0, 1)
    const rest = packet.text.slice(2).trim()
    return rest ? `${command} — ${rest}` : command
  }
  return packet.text.trim()
}

function settings(params: InitParams) {
  const length = params.longLength ? `${params.maxLength}/${params.longLength}` : params.maxLength
  const window = params.windowSize && params.windowSize > 1 ? ` · Fenster ${params.windowSize}` : ''
  return (
    `Paketlänge ${length} · Prüfsumme ${params.checkType} · ` +
    `Zeitgrenze ${params.timeout} s${window}`
  )
}

function merkmale(attributes: FileAttributes) {
  const parts: string[] = []
  if (attributes.size !== null) parts.push(`${attributes.size} Bytes`)
  if (attributes.binary !== null) parts.push(attributes.binary ? 'binär' : 'Text')
  if (attributes.date) parts.push(datum(attributes.date))
  return parts.join(' · ')
}

/* Kermit dates are yyyymmdd, and read as dates once they have their dashes. */
function datum(date: string) {
  const parts = /^(\d{4})(\d{2})(\d{2})(.*)$/.exec(date)
  return parts ? `${parts[1]}-${parts[2]}-${parts[3]}${parts[4]}` : date
}
