import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import PageHeading from '@components/PageHeading.tsx'
import Card from '@components/Card.tsx'
import Button from '@components/Button.tsx'
import {
  bytesPerSecond,
  requestPort,
  SerialBridge,
  webSerialAvailable,
  type BridgeState,
  type Counters,
  type Flow,
  type LineSettings,
  type Mode,
} from '@utils/serialBridge'

/*
 * Die Seite, auf der ein Aussteller seine Maschine an die Ausstellung hängt.
 *
 * Am einen Ende des Nullmodems steht das Ausstellungsstück, am anderen der
 * serielle Anschluss dieses Computers. Was hier eingestellt wird, gilt für diese
 * Leitung — Geschwindigkeit, Format, Flusskontrolle —, denn dies ist die
 * Maschine, an der die Leitung hängt. Über das Netz geht nur der Datenstrom.
 */

const SPEEDS = [110, 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
const FORMATS = ['8N1', '7E1', '7O1', '8N2', '8E1'] as const
const TERMS = ['vt100', 'vt52', 'vt220', 'ansi', 'adm3a', 'tty', 'dumb']

/* Die Programmdateien liegen dort, wo sie gebaut werden. */
const RELEASES = 'https://code.netzhansa.com/hanshuebner/fotofix/releases'

const DEFAULTS: LineSettings = {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flow: 'none',
  term: 'vt100',
  cols: 80,
  rows: 24,
}

function applyFormat(line: LineSettings, format: string): LineSettings {
  const dataBits = Number(format[0]) === 7 ? 7 : 8
  const parity = format[1] === 'E' ? 'even' : format[1] === 'O' ? 'odd' : 'none'
  const stopBits = Number(format[2]) === 2 ? 2 : 1
  return { ...line, dataBits, parity, stopBits }
}

function formatOf(line: LineSettings) {
  const parity = line.parity === 'even' ? 'E' : line.parity === 'odd' ? 'O' : 'N'
  return `${line.dataBits}${parity}${line.stopBits}`
}

type TokenRow = {
  id: number
  prefix: string
  label: string
  createdAt: string
  expiresAt: string
  lastUsedAt: string | null
  expired: boolean
}

const SerialPortPage = () => {
  const [line, setLine] = useState<LineSettings>(DEFAULTS)
  const [state, setState] = useState<BridgeState>('idle')
  const [detail, setDetail] = useState<string>('')
  const [portChosen, setPortChosen] = useState(false)
  const [agents, setAgents] = useState<{ name: string; sessions: number; maxSessions: number }[]>(
    [],
  )
  const [agent, setAgent] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [counters, setCounters] = useState<Counters>({
    toWire: 0,
    fromWire: 0,
    stops: 0,
    framingErrors: 0,
    parityErrors: 0,
    paused: false,
  })

  const portRef = useRef<SerialPort | null>(null)
  const bridgeRef = useRef<SerialBridge | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const termHost = useRef<HTMLDivElement | null>(null)

  const supported = webSerialAvailable()

  useEffect(() => {
    if (!termHost.current || termRef.current) return
    const term = new Terminal({
      cols: line.cols,
      rows: line.rows,
      convertEol: false,
      fontSize: 13,
      theme: { background: '#101010' },
    })
    term.open(termHost.current)
    term.onData((text) => bridgeRef.current?.typed(text))
    termRef.current = term
    return () => {
      term.dispose()
      termRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetch('/api/serial/agents', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { agents: [] }))
      .then((body) => setAgents(body.agents ?? []))
  }, [])

  const choosePort = useCallback(async () => {
    const port = await requestPort().catch(() => null)
    if (!port) return
    portRef.current = port
    setPortChosen(true)
  }, [])

  const connect = useCallback(async () => {
    if (!portRef.current) return
    const bridge = new SerialBridge(portRef.current, line, {
      onData: (chunk) => termRef.current?.write(chunk),
      onState: (next, why) => {
        setState(next)
        setDetail(why ?? '')
        /*
         * Ein zurückgesetztes Terminal, sobald die Sitzung endet: was übrig
         * bleibt, gehört einer Verbindung, die es nicht mehr gibt, und ein
         * Programm auf der Gegenseite kann es in jedem Modus hinterlassen
         * haben. Warum die Sitzung endete, steht in der Zeile darunter.
         */
        if (next === 'stopped') termRef.current?.reset()
      },
      onCounters: setCounters,
    })
    bridgeRef.current = bridge
    await bridge.start(agent || undefined, mode).catch((error: Error) => {
      setState('stopped')
      setDetail(error.message)
    })
  }, [line, agent, mode])

  const disconnect = useCallback(async () => {
    await bridgeRef.current?.stop('getrennt')
    bridgeRef.current = null
  }, [])

  /*
   * Geschwindigkeit und Format sind auch während der Sitzung einstellbar: dass
   * sie falsch sind, merkt man erst, wenn Zeichensalat ankommt. Der Anschluss
   * wird dafür geschlossen und neu geöffnet, die Sitzung auf der Gegenseite
   * bleibt bestehen.
   */
  const change = useCallback(
    async (next: LineSettings) => {
      setLine(next)
      if (bridgeRef.current && state === 'running') await bridgeRef.current.retune(next)
    },
    [state],
  )

  const running = state === 'running' || state === 'connecting'

  if (!supported) {
    return (
      <>
        <PageHeading>Serielle Verbindung</PageHeading>
        <Card>
          <p>
            Dieser Browser kann keine seriellen Anschlüsse öffnen. Chrome, Edge und Opera können es;
            Firefox und Safari nicht.
          </p>
          <p className="mt-2">
            Mit dem Kommandozeilenprogramm <code>fotofix-serial</code> geht es von jedem System aus
            — siehe unten.
          </p>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeading>Serielle Verbindung</PageHeading>

      <Card>
        <p>
          Dein Ausstellungsstück hängt über ein Nullmodem am seriellen Anschluss dieses Computers.
          Diese Seite legt die Anmeldung der Ausstellung auf diesen Anschluss — dieselbe, die im
          Saal an den seriellen Ports steht.
        </p>
        <p className="mt-2">
          Anmeldung: <code>foto</code> / <code>foto</code>. Die Fotos liegen unter der Foto-ID vom
          Beleg. Holen mit <code>sz -e datei</code>, <code>sx datei</code> oder{' '}
          <code>kermit -s datei</code>.
        </p>
      </Card>

      <Card className="mt-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <label>
            Geschwindigkeit
            <select
              value={line.baudRate}
              onChange={(event) => void change({ ...line, baudRate: Number(event.target.value) })}>
              {SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}
                </option>
              ))}
            </select>
          </label>

          <label>
            Format
            <select
              value={formatOf(line)}
              onChange={(event) => void change(applyFormat(line, event.target.value))}>
              {FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </label>

          <label>
            Flusskontrolle
            <select
              value={line.flow}
              onChange={(event) => void change({ ...line, flow: event.target.value as Flow })}>
              <option value="none">keine</option>
              <option value="hardware">Hardware (RTS/CTS)</option>
              <option value="xonxoff">XON/XOFF</option>
            </select>
          </label>

          <label>
            Betriebsart
            <select
              value={mode}
              disabled={running}
              onChange={(event) => setMode(event.target.value as Mode)}>
              <option value="login">Anmeldung</option>
              <option value="kermit">Kermit-Server</option>
            </select>
          </label>

          <label>
            Terminal
            <select
              value={line.term}
              disabled={running}
              onChange={(event) => setLine({ ...line, term: event.target.value })}>
              {TERMS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </label>
        </div>

        {agents.length > 1 && (
          <label className="mt-4 block">
            Gegenstelle
            <select value={agent} disabled={running} onChange={(e) => setAgent(e.target.value)}>
              <option value="">automatisch</option>
              {agents.map((one) => (
                <option key={one.name} value={one.name}>
                  {one.name} ({one.sessions}/{one.maxSessions})
                </option>
              ))}
            </select>
          </label>
        )}

        {mode === 'kermit' && (
          <p className="mt-3 text-sm">
            Der Anschluss antwortet direkt mit einem Kermit-Server, ohne Anmeldung. Das Gegenstück
            holt Dateien mit <code>get K7NP4M/photo.jpg</code> und beendet den Server mit{' '}
            <code>finish</code>. Im Saal legt der Terminalserver fest, welcher Anschluss so
            betrieben wird.
          </p>
        )}

        {line.flow === 'xonxoff' && (
          <p className="mt-3 text-sm">
            XON/XOFF ist nicht acht Bit sauber. Für Dateiübertragungen <code>sz -e</code> benutzen
            oder Kermit, das Steuerzeichen von sich aus maskiert.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => void choosePort()} disabled={running}>
            {portChosen ? 'Anderen Anschluss wählen' : 'Anschluss wählen'}
          </Button>
          {!running && (
            <Button variant="secondary" onClick={() => void connect()} disabled={!portChosen}>
              Verbinden
            </Button>
          )}
          {running && (
            <Button variant="danger" onClick={() => void disconnect()}>
              Trennen
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={state !== 'running'}
            onClick={() => bridgeRef.current?.typed('\r')}>
            Eingabetaste senden
          </Button>
        </div>

        <p className="mt-3 text-sm">
          {state === 'running' ? (
            <>
              verbunden — {bytesPerSecond(line)} Zeichen/s · {counters.toWire} zur Leitung,{' '}
              {counters.fromWire} von ihr · {counters.stops} Stopps
              {counters.paused && ' · angehalten'}
              {counters.framingErrors > 0 &&
                ` · ${counters.framingErrors} Rahmenfehler (Geschwindigkeit prüfen)`}
              {counters.parityErrors > 0 &&
                ` · ${counters.parityErrors} Paritätsfehler (Format prüfen)`}
            </>
          ) : (
            (detail ?? '') || 'nicht verbunden'
          )}
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-2 text-lg font-semibold">Mitschnitt</h2>
        <p className="mb-2 text-sm">
          Was über die Leitung geht, steht auch hier — und hier kann getippt werden, wenn dein
          Ausstellungsstück gerade nicht angeschlossen ist. So lässt sich unterscheiden, ob es an
          der Gegenstelle liegt oder am Kabel.
        </p>
        <div ref={termHost} className="overflow-x-auto" />
      </Card>

      <SerialTokens />
    </>
  )
}

/*
 * Das Kommandozeilenprogramm hat keine Sitzung, in der es stecken könnte, und
 * trägt stattdessen ein Token. Es wird einmal angezeigt und als Hash
 * gespeichert; wer es verliert, erzeugt ein neues.
 */
const SerialTokens = () => {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [label, setLabel] = useState('')
  const [fresh, setFresh] = useState('')
  const [problem, setProblem] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/serial/tokens', { credentials: 'include' })
    if (response.ok) setTokens((await response.json()).tokens ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async () => {
    setProblem('')
    const response = await fetch('/api/serial/tokens', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    })
    const body = await response.json()
    if (!response.ok) {
      setProblem(body.error ?? 'Das Token konnte nicht erzeugt werden.')
      return
    }
    setFresh(body.token)
    setLabel('')
    await load()
  }

  const revoke = async (id: number) => {
    const response = await fetch(`/api/serial/tokens/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!response.ok) {
      setProblem('Das Token konnte nicht zurückgezogen werden.')
      return
    }
    await load()
  }

  return (
    <Card className="mt-4">
      <h2 className="mb-2 text-lg font-semibold">Kommandozeile</h2>
      <p className="text-sm">
        <code>fotofix-serial</code> läuft auf Windows, macOS und Linux und braucht keinen Browser:
      </p>
      <pre className="my-2 overflow-x-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-800">
        fotofix-serial --port /dev/ttyUSB0 --speed {DEFAULTS.baudRate} --format 8N1 --flow xonxoff
      </pre>
      <p className="text-sm">
        Das Programm heruntergeladen, das Token in eine Datei gelegt, fertig. Heruntergeladene
        Programme sind gesperrt; die Sperre nimmt man so weg:
      </p>
      {/* Ein Template-Literal, weil JSX Zeilenumbrüche in Text zu Leerzeichen macht. */}
      <pre className="my-2 overflow-x-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-800">
        {`xattr -d com.apple.quarantine fotofix-serial   # macOS
Unblock-File -Path .\\fotofix-serial.exe        # Windows`}
      </pre>

      <p className="my-3">
        <a
          href={RELEASES}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-teal-600/80 px-4 py-2 text-white no-underline hover:bg-teal-600">
          fotofix-serial herunterladen
        </a>
      </p>
      <p className="text-sm text-gray-500">
        Eine Datei je System — Windows, macOS und Linux, jeweils Intel und ARM.
      </p>

      {fresh && (
        <div className="my-3 rounded border border-amber-500 p-3">
          <p className="text-sm font-semibold">
            Dieses Token wird nur jetzt angezeigt. Gespeichert ist nur sein Hash.
          </p>
          <pre className="mt-2 overflow-x-auto text-sm">{fresh}</pre>
        </div>
      )}

      {problem && <p className="my-2 text-sm text-red-600">{problem}</p>}

      <p className="mt-4 text-sm">
        Gib dem Token einen Namen, an dem du es in der Liste wiedererkennst — das Token selbst
        siehst du nur einmal.
      </p>
      <div className="my-2 flex flex-wrap items-center gap-2">
        <input
          value={label}
          placeholder="z.B. Thinkpad"
          onChange={(event) => setLabel(event.target.value)}
        />
        <Button onClick={() => void create()} disabled={!label.trim()}>
          Token erzeugen
        </Button>
      </div>

      {tokens.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Anfang</th>
              <th>Zuletzt benutzt</th>
              <th>Läuft ab</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td>{token.label}</td>
                <td>
                  <code>{token.prefix}…</code>
                </td>
                <td>
                  {token.lastUsedAt
                    ? new Date(token.lastUsedAt).toLocaleDateString('de-DE')
                    : 'nie'}
                </td>
                <td>
                  {new Date(token.expiresAt).toLocaleDateString('de-DE')}
                  {token.expired && ' (abgelaufen)'}
                </td>
                <td>
                  <Button variant="danger" onClick={() => void revoke(token.id)}>
                    Zurückziehen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export default SerialPortPage
