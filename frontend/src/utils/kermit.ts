/*
 * The Kermit protocol, read off the wire.
 *
 * A port in Kermit mode carries packets, not characters: the stream is framed
 * by SOH and the data inside it is prefix-encoded, so putting it through a
 * terminal emulator shows nothing and leaves the emulator in whatever state
 * the last escape-looking byte sequence put it in. This reads the framing
 * instead, and hands out one event per packet — and one per run of bytes that
 * belongs to no packet, which is what line trouble looks like from here.
 *
 * The decoder follows the stream rather than driving it: it starts wherever it
 * is switched on, resynchronises on the next SOH, and takes the negotiated
 * block check and prefixes from the Send-Init exchange it sees go past.
 */

/* Which end a packet came from. */
export type Origin = 'machine' | 'exhibition'

export type InitParams = {
  maxLength: number
  timeout: number
  padding: number
  padChar: number
  eol: number
  quote: string
  binaryQuote: string | null
  checkType: number
  repeatQuote: string | null
  capabilities: number
  windowSize: number | null
  longLength: number | null
}

/* What a file-attribute packet says about the file that is about to arrive. */
export type FileAttributes = {
  size: number | null
  date: string | null
  binary: boolean | null
  protection: string | null
}

export type KermitPacket = {
  kind: 'packet'
  origin: Origin
  /* The packet type letter — S, F, D, Z, Y, N, E, G … */
  type: string
  seq: number
  /* The data field as it travelled, prefixes and all. */
  dataLength: number
  /* The same field made readable, for the types that carry text. */
  text: string
  long: boolean
  checkOk: boolean
  params: InitParams | null
  attributes: FileAttributes | null
}

export type KermitNoise = {
  kind: 'noise'
  origin: Origin
  bytes: Uint8Array
}

export type KermitEvent = KermitPacket | KermitNoise

const MARK = 0x01

/*
 * The longest packet anything will send here — C-Kermit's own ceiling for an
 * extended-length packet. A declared length past it is a mis-read header
 * rather than a packet worth waiting for.
 */
const MAX_PACKET = 9024

/*
 * Bytes between packets that are the protocol's own: the terminator after the
 * block check, and the padding a slow host asks for. They are not noise, and
 * reporting them would bury the bytes that are.
 */
const FILLER = new Set([0x00, 0x0a, 0x0d, 0x11, 0x13])

const EMPTY = new Uint8Array(0)

const unchar = (byte: number) => byte - 32
const ctl = (byte: number) => byte ^ 64

/* A field that carries tochar()-encoded data — printable ASCII, always. */
const encoded = (byte: number) => byte >= 0x20 && byte < 0x7f

const isType = (byte: number) => byte >= 0x41 && byte <= 0x5a

function checksum1(bytes: Uint8Array, from: number, to: number) {
  let sum = 0
  for (let at = from; at < to; at++) sum += bytes[at]
  return (sum + ((sum & 0xc0) >> 6)) & 0x3f
}

function checksum2(bytes: Uint8Array, from: number, to: number) {
  let sum = 0
  for (let at = from; at < to; at++) sum += bytes[at]
  return sum & 0xfff
}

/* CRC-CCITT, nibble at a time, as every Kermit computes it. */
function crc16(bytes: Uint8Array, from: number, to: number) {
  let crc = 0
  for (let at = from; at < to; at++) {
    const byte = bytes[at]
    let q = (crc ^ byte) & 0x0f
    crc = (crc >> 4) ^ (q * 0x1081)
    q = (crc ^ (byte >> 4)) & 0x0f
    crc = (crc >> 4) ^ (q * 0x1081)
  }
  return crc & 0xffff
}

function checkMatches(bytes: Uint8Array, from: number, to: number, length: number) {
  if (length === 1) return bytes[to] === 32 + checksum1(bytes, from, to)
  if (length === 2) {
    const sum = checksum2(bytes, from, to)
    return bytes[to] === 32 + ((sum >> 6) & 0x3f) && bytes[to + 1] === 32 + (sum & 0x3f)
  }
  const crc = crc16(bytes, from, to)
  return (
    bytes[to] === 32 + ((crc >> 12) & 0x0f) &&
    bytes[to + 1] === 32 + ((crc >> 6) & 0x3f) &&
    bytes[to + 2] === 32 + (crc & 0x3f)
  )
}

/* Control characters and the eighth bit travel as printable ASCII. */
export function readable(bytes: Uint8Array) {
  let text = ''
  for (const byte of bytes) {
    if (byte >= 0x20 && byte < 0x7f) text += String.fromCharCode(byte)
    else if (byte < 0x20) text += `^${String.fromCharCode(byte + 64)}`
    else if (byte === 0x7f) text += '^?'
    else text += `\\x${byte.toString(16).padStart(2, '0')}`
  }
  return text
}

export function hex(bytes: Uint8Array, limit = 16) {
  const shown = bytes.subarray(0, limit)
  const text = Array.from(shown, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(
    ' ',
  )
  return bytes.length > limit ? `${text} …` : text
}

/*
 * The types whose data field is text an exhibitor can act on, and which carry
 * it prefix-encoded the way file data is. The parameter and attribute packets
 * are built from printable characters and travel as they are.
 */
const TEXTUAL = new Set(['F', 'X', 'E', 'R', 'G', 'C', 'Y', 'N', 'Z', 'B'])

/*
 * A run of bytes belonging to no packet is reported once it is this long, and
 * held back until then: at 9600 baud a line of noise arrives in pieces, and a
 * transcript with one line per piece hides the shape of what came in.
 */
const NOISE_RUN = 32

type Parse =
  | { status: 'ok'; packet: KermitPacket; end: number }
  | { status: 'more' }
  | { status: 'bad' }

export class KermitMonitor {
  private held: Record<Origin, Uint8Array> = { machine: EMPTY, exhibition: EMPTY }

  /*
   * What the two ends have agreed on. Both directions share it: a Send-Init
   * and the acknowledgement to it settle the block check and the prefixes for
   * the transfer that follows, in either direction.
   */
  private checkLength = 1
  private quote: number | null = 0x23
  private binaryQuote: number | null = null
  private repeatQuote: number | null = null
  private negotiating = false

  feed(origin: Origin, chunk: Uint8Array): KermitEvent[] {
    const buffer = join(this.held[origin], chunk)
    const events: KermitEvent[] = []

    let at = 0
    let noise = -1

    const flushNoise = (until: number) => {
      if (noise < 0) return
      events.push({ kind: 'noise', origin, bytes: buffer.slice(noise, until) })
      noise = -1
    }

    while (at < buffer.length) {
      if (buffer[at] !== MARK) {
        if (FILLER.has(buffer[at])) flushNoise(at)
        else if (noise < 0) noise = at
        at += 1
        continue
      }

      const parsed = this.parse(buffer, at, origin)
      if (parsed.status === 'more') break
      if (parsed.status === 'bad') {
        if (noise < 0) noise = at
        at += 1
        continue
      }

      flushNoise(at)
      this.learn(parsed.packet)
      events.push(parsed.packet)
      at = parsed.end
    }

    /*
     * Stopping at a packet start settles the bytes before it; stopping at the
     * end of the chunk does not, and a short run there waits for the rest of
     * itself to arrive.
     */
    if (at < buffer.length) flushNoise(at)
    else if (noise >= 0 && buffer.length - noise >= NOISE_RUN) flushNoise(buffer.length)
    else if (noise >= 0) at = noise

    this.held[origin] = at < buffer.length ? buffer.slice(at) : EMPTY
    return events
  }

  /*
   * A short run of stray bytes is held in case the rest of it is still on its
   * way, and a line that goes quiet would leave it there. Called from time to
   * time, this reports what is waiting — held bytes that start with no packet
   * mark, so an unfinished packet keeps its chance to finish however slow the
   * line is.
   */
  idle(): KermitEvent[] {
    const events: KermitEvent[] = []
    for (const origin of ['machine', 'exhibition'] as Origin[]) {
      const held = this.held[origin]
      if (!held.length || held[0] === MARK) continue
      this.held[origin] = EMPTY
      events.push({ kind: 'noise', origin, bytes: held })
    }
    return events
  }

  private parse(buffer: Uint8Array, at: number, origin: Origin): Parse {
    if (at + 4 > buffer.length) return { status: 'more' }

    const lenChar = buffer[at + 1]
    const seqChar = buffer[at + 2]
    const typeChar = buffer[at + 3]
    if (!encoded(lenChar) || !encoded(seqChar) || !isType(typeChar)) return { status: 'bad' }

    const type = String.fromCharCode(typeChar)
    const length = unchar(lenChar)

    let dataStart: number
    let end: number
    const long = length === 0

    if (long) {
      if (at + 7 > buffer.length) return { status: 'more' }
      const high = buffer[at + 4]
      const low = buffer[at + 5]
      if (!encoded(high) || !encoded(low) || !encoded(buffer[at + 6])) return { status: 'bad' }
      /* The header carries its own check, so a mis-read length is caught here. */
      if (buffer[at + 6] !== 32 + checksum1(buffer, at + 1, at + 6)) return { status: 'bad' }
      const extended = unchar(high) * 95 + unchar(low)
      if (extended > MAX_PACKET) return { status: 'bad' }
      dataStart = at + 7
      end = dataStart + extended
    } else {
      if (length < 2) return { status: 'bad' }
      dataStart = at + 4
      end = at + 2 + length
    }

    if (end > buffer.length) return { status: 'more' }

    /*
     * The block check is whatever the two ends settled on, except during the
     * Send-Init exchange, which is always a single character because it is
     * where the choice is made. A session joined in the middle has seen no
     * such exchange, so a check that does not verify is tried at the other
     * lengths, and the one that verifies is taken as the agreement.
     */
    const preferred = type === 'S' || type === 'I' || (type === 'Y' && this.negotiating)
    let checkLength = preferred ? 1 : this.checkLength
    let checkOk = false
    for (const candidate of [checkLength, 1, 2, 3]) {
      if (end - candidate < dataStart) continue
      if (!checkMatches(buffer, at + 1, end - candidate, candidate)) continue
      checkLength = candidate
      checkOk = true
      break
    }
    if (checkOk && !preferred) this.checkLength = checkLength

    const dataEnd = Math.max(dataStart, end - checkLength)
    const data = buffer.subarray(dataStart, dataEnd)

    return {
      status: 'ok',
      packet: {
        kind: 'packet',
        origin,
        type,
        seq: unchar(seqChar) & 0x3f,
        dataLength: data.length,
        text: TEXTUAL.has(type)
          ? readable(this.unprefix(data))
          : type === 'A'
            ? readable(data)
            : '',
        long,
        checkOk,
        /* Send-Init fields travel literally: the prefixes are what they settle. */
        params: preferred ? params(data) : null,
        attributes: type === 'A' ? attributes(data) : null,
      },
      end: skipFiller(buffer, end),
    }
  }

  /*
   * The Send-Init exchange, watched from beside it. The proposal names what the
   * sender can do and the acknowledgement names what will be used, so it is the
   * acknowledgement that settles the block check and the prefixes — from the
   * packet after it onwards.
   */
  private learn(packet: KermitPacket) {
    if (packet.type === 'S' || packet.type === 'I') {
      this.negotiating = true
      this.checkLength = 1
      return
    }
    if (!this.negotiating) return
    if (packet.type === 'Y' && packet.params) {
      const agreed = packet.params
      this.checkLength = agreed.checkType === 2 ? 2 : agreed.checkType === 3 ? 3 : 1
      this.quote = agreed.quote ? agreed.quote.charCodeAt(0) : null
      this.binaryQuote = agreed.binaryQuote ? agreed.binaryQuote.charCodeAt(0) : null
      this.repeatQuote = agreed.repeatQuote ? agreed.repeatQuote.charCodeAt(0) : null
      this.negotiating = false
      return
    }
    if (packet.type === 'E' || packet.type === 'N') this.negotiating = false
  }

  /* Repeat count, eighth bit, control quote — in that order, as they are sent. */
  private unprefix(data: Uint8Array) {
    const out: number[] = []
    for (let at = 0; at < data.length; at++) {
      let count = 1
      if (this.repeatQuote !== null && data[at] === this.repeatQuote && at + 2 < data.length) {
        count = unchar(data[at + 1])
        at += 2
      }
      let eighth = 0
      if (this.binaryQuote !== null && data[at] === this.binaryQuote && at + 1 < data.length) {
        eighth = 0x80
        at += 1
      }
      let byte = data[at]
      if (this.quote !== null && byte === this.quote && at + 1 < data.length) {
        at += 1
        byte = data[at]
        const bare = byte & 0x7f
        if (bare >= 0x3f && bare <= 0x5f) byte = ctl(byte)
      }
      for (let again = 0; again < count; again++) out.push(byte | eighth)
    }
    return new Uint8Array(out)
  }
}

/*
 * The parameters of a Send-Init or of the acknowledgement to one. Fields past
 * the ninth are extensions, and an old Kermit simply stops sending at the
 * point its version knew about.
 */
function params(data: Uint8Array): InitParams | null {
  if (data.length < 9) return null
  const at = (index: number) => (index < data.length ? data[index] : 0x20)
  const prefix = (byte: number) => (encoded(byte) && byte !== 0x20 && byte !== 0x4e ? byte : 0)
  const char = (byte: number) => (byte ? String.fromCharCode(byte) : null)
  const binary = at(6)
  const long = data.length >= 13 ? unchar(at(11)) * 95 + unchar(at(12)) : null

  return {
    maxLength: unchar(at(0)),
    timeout: unchar(at(1)),
    padding: unchar(at(2)),
    padChar: ctl(at(3)),
    eol: unchar(at(4)),
    quote: String.fromCharCode(at(5)),
    /* `Y` means willing, and the char both ends then use is the usual one. */
    binaryQuote: binary === 0x59 ? '&' : char(prefix(binary)),
    checkType: at(7) >= 0x31 && at(7) <= 0x39 ? at(7) - 0x30 : 1,
    repeatQuote: char(prefix(at(8))),
    capabilities: data.length >= 10 ? unchar(at(9)) : 0,
    windowSize: data.length >= 11 ? unchar(at(10)) : null,
    longLength: long,
  }
}

/*
 * An attribute packet: one field after another, each a letter, a length and a
 * value. The ones an exhibitor watching a transfer wants are the size, the
 * date and whether the file is being sent as text or as the bytes it is.
 */
function attributes(data: Uint8Array): FileAttributes {
  const found: FileAttributes = { size: null, date: null, binary: null, protection: null }
  let at = 0
  while (at + 1 < data.length) {
    const letter = String.fromCharCode(data[at])
    const length = unchar(data[at + 1])
    if (length < 0 || at + 2 + length > data.length) break
    const value = readable(data.subarray(at + 2, at + 2 + length))
    at += 2 + length
    if (letter === '1') found.size = Number(value) || null
    else if (letter === '!' && found.size === null) found.size = (Number(value) || 0) * 1024 || null
    else if (letter === '#') found.date = value
    else if (letter === '"') found.binary = value.startsWith('B')
    else if (letter === ',') found.protection = value
  }
  return found
}

function skipFiller(buffer: Uint8Array, at: number) {
  let past = at
  while (past < buffer.length && FILLER.has(buffer[past])) past += 1
  return past
}

function join(held: Uint8Array, chunk: Uint8Array) {
  if (!held.length) return chunk
  const both = new Uint8Array(held.length + chunk.length)
  both.set(held, 0)
  both.set(chunk, held.length)
  return both
}
