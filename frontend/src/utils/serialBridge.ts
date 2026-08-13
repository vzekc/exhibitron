/*
 * The browser's end of the wire.
 *
 * A retro machine sits on a null modem at the other end of a serial port on
 * this computer; this puts the exhibition's login on it, with no installation
 * and nothing to download.
 *
 * Everything about the line is settled here, because this is the machine the
 * line is attached to. What crosses the network is the stream, and the byte
 * rate the agent paces itself to.
 */

export type Flow = 'none' | 'hardware' | 'xonxoff'

export type LineSettings = {
  baudRate: number
  dataBits: 7 | 8
  parity: 'none' | 'even' | 'odd'
  stopBits: 1 | 2
  flow: Flow
  term: string
  cols: number
  rows: number
}

export type BridgeState = 'idle' | 'connecting' | 'running' | 'stopped'

export type BridgeEvents = {
  onData: (chunk: Uint8Array) => void
  onState: (state: BridgeState, detail?: string) => void
  onCounters: (counters: Counters) => void
}

export type Counters = {
  toWire: number
  fromWire: number
  stops: number
  framingErrors: number
  parityErrors: number
  paused: boolean
}

const XON = 0x11
const XOFF = 0x13

/* One chunk is this much wire time, which is the overshoot budget after a stop. */
const CHUNK_MILLIS = 30
const CHUNK_MIN = 16
const CHUNK_MAX = 256

export function bitsPerByte(line: LineSettings) {
  return 1 + line.dataBits + (line.parity === 'none' ? 0 : 1) + line.stopBits
}

export function bytesPerSecond(line: LineSettings) {
  return Math.floor(line.baudRate / bitsPerByte(line))
}

function chunkSize(line: LineSettings) {
  const size = Math.floor((bytesPerSecond(line) * CHUNK_MILLIS) / 1000)
  return Math.min(CHUNK_MAX, Math.max(CHUNK_MIN, size))
}

export function webSerialAvailable() {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

export async function requestPort(): Promise<SerialPort> {
  return await navigator.serial.requestPort()
}

export class SerialBridge {
  private socket: WebSocket | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private reading = false
  private stopping = false
  private stopped = false

  /*
   * The gate the writer waits at. An XOFF from the machine is acted on here,
   * within a character time; one that had to cross the network and come back
   * would arrive a round trip late, and at 9600 baud that is a hundred bytes
   * past the point where the machine stopped being able to take them.
   */
  private paused = false
  private waiters: Array<() => void> = []

  private counters: Counters = {
    toWire: 0,
    fromWire: 0,
    stops: 0,
    framingErrors: 0,
    parityErrors: 0,
    paused: false,
  }

  constructor(
    private port: SerialPort,
    private line: LineSettings,
    private events: BridgeEvents,
  ) {}

  async start(agent?: string) {
    this.events.onState('connecting')
    await this.port.open(this.openOptions())

    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const query = new URLSearchParams({
      term: this.line.term,
      cols: String(this.line.cols),
      rows: String(this.line.rows),
    })
    if (agent) query.set('agent', agent)

    const socket = new WebSocket(`${scheme}://${window.location.host}/api/serial/session?${query}`)
    socket.binaryType = 'arraybuffer'
    this.socket = socket

    socket.onopen = () => {
      this.tellRate()
      this.events.onState('running')
      void this.pumpSerial()
    }

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data) as { t?: string; reason?: string }
        if (message.t === 'exit') this.stop(message.reason ?? 'the session ended')
        return
      }
      void this.toSerial(new Uint8Array(event.data as ArrayBuffer))
    }

    socket.onclose = () => this.stop('the connection closed')
    socket.onerror = () => this.stop('the connection failed')
  }

  private openOptions(): SerialOptions {
    return {
      baudRate: this.line.baudRate,
      dataBits: this.line.dataBits,
      stopBits: this.line.stopBits,
      parity: this.line.parity,
      /*
       * Web Serial knows hardware handshaking and nothing else, so a line that
       * runs on XON/XOFF is opened without flow control and the characters are
       * acted on in this file.
       */
      flowControl: this.line.flow === 'hardware' ? 'hardware' : 'none',
    }
  }

  private send(message: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message))
  }

  private tellRate() {
    this.send({ t: 'rate', bps: bytesPerSecond(this.line) })
  }

  private bump() {
    this.counters.paused = this.paused
    this.events.onCounters({ ...this.counters })
  }

  /*
   * The wire toward the network. On a software-flow-controlled line the stop
   * and start characters are taken out of the stream here, and a frame goes
   * upstream so the agent stops reading its pty — which bounds the queue while
   * the line is stopped, and works whether or not the pty is honouring ^S.
   */
  private async pumpSerial() {
    this.reading = true

    /*
     * Framing and parity errors error the stream rather than arriving as
     * values, so a single reader would die on the first one. The outer loop is
     * how the API expects to be read: a new reader each time, until `readable`
     * goes null, which is the only fatal case.
     */
    while (this.port.readable && !this.stopping) {
      const reader = this.port.readable.getReader()
      this.reader = reader
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) this.fromSerial(value)
        }
      } catch (error) {
        this.noteLineError(error)
      } finally {
        this.reader = null
        reader.releaseLock()
      }
    }
    this.reading = false
  }

  private noteLineError(error: unknown) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'FramingError') this.counters.framingErrors += 1
    else if (name === 'ParityError') this.counters.parityErrors += 1
    this.bump()
  }

  private fromSerial(value: Uint8Array) {
    this.counters.fromWire += value.length
    let payload = value

    if (this.line.flow === 'xonxoff') {
      const kept: number[] = []
      for (const byte of value) {
        if (byte === XOFF) this.setPaused(true)
        else if (byte === XON) this.setPaused(false)
        else kept.push(byte)
      }
      payload = new Uint8Array(kept)
    }

    this.events.onData(value)
    if (payload.length && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(payload)
    }
    this.bump()
  }

  private setPaused(paused: boolean) {
    if (this.paused === paused) return
    this.paused = paused
    if (paused) {
      this.counters.stops += 1
      this.send({ t: 'pause' })
    } else {
      this.send({ t: 'resume' })
      const waiting = this.waiters
      this.waiters = []
      for (const wake of waiting) wake()
    }
    this.bump()
  }

  private gate() {
    if (!this.paused || this.stopping) return Promise.resolve()
    return new Promise<void>((resolve) => this.waiters.push(resolve))
  }

  /*
   * The network toward the wire, in chunks.
   *
   * A write resolves when the operating system accepts the bytes, not when
   * they leave, and several kilobytes can sit downstream of anything this code
   * can observe — seconds of committed data at 9600 baud, which no XOFF can
   * take back. Writing a chunk at a time and awaiting each one keeps that
   * buffer shallow, so a machine that says stop is pushed one chunk further
   * and no more.
   */
  private async toSerial(data: Uint8Array) {
    /* The exhibition's own output, which is most of what there is to see. */
    this.events.onData(data)
    if (!this.port.writable) return
    if (!this.writer) this.writer = this.port.writable.getWriter()

    const size = chunkSize(this.line)
    for (let at = 0; at < data.length; at += size) {
      await this.gate()
      if (this.stopping) return
      await this.writer.write(data.subarray(at, Math.min(at + size, data.length)))
      this.counters.toWire += Math.min(size, data.length - at)
    }
    this.bump()
  }

  /* What the exhibitor types in the terminal, when the machine is not there. */
  typed(text: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(new TextEncoder().encode(text))
    }
  }

  /*
   * A speed or format change, bracketed by the flow control that already
   * exists. Nothing is in flight while the agent retunes, so it does not
   * matter whether the line got faster or slower. The websocket and the login
   * on the far end are untouched: what is running there does not notice.
   */
  async retune(line: LineSettings) {
    this.send({ t: 'pause' })
    const wasPaused = this.paused
    this.paused = true

    await this.releaseSerial()
    this.line = line
    await this.port.open(this.openOptions())

    this.tellRate()
    this.send({ t: 'winsize', cols: line.cols, rows: line.rows })
    this.send({ t: 'resume' })

    this.paused = wasPaused
    if (!this.paused) {
      const waiting = this.waiters
      this.waiters = []
      for (const wake of waiting) wake()
    }

    void this.pumpSerial()
    this.bump()
  }

  private async releaseSerial() {
    this.stopping = true

    /* Let go of anyone parked on an XOFF that will now never be lifted. */
    const waiting = this.waiters
    this.waiters = []
    for (const wake of waiting) wake()

    this.writer?.releaseLock()
    this.writer = null

    /*
     * Cancel the reader that is held, not the stream it is locked to —
     * `readable.cancel()` on a locked stream throws, and the pump would then
     * sit in `read()` for ever with nothing after this ever running.
     */
    if (this.reader) {
      await this.reader.cancel().catch(() => {})
      this.reader = null
    }

    const until = Date.now() + 2000
    while (this.reading && Date.now() < until) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    await this.port.close().catch(() => {})
    this.stopping = false
  }

  async stop(detail?: string) {
    /* Both the exit frame and the close that follows it arrive here. */
    if (this.stopped) return
    this.stopped = true

    if (this.socket) {
      this.socket.onclose = null
      this.socket.onerror = null
      this.socket.close()
      this.socket = null
    }
    await this.releaseSerial()
    this.events.onState('stopped', detail)
  }
}
