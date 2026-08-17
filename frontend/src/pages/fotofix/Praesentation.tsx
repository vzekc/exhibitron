import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

/*
 * Der Vortrag für Mitwirkende, elf Folien, für den Beamer.
 *
 * Die Folie füllt den Schirm und trägt keine Navigation der Website: sie wird
 * projiziert, nicht gelesen. Schrift und Farben sind die der Website, damit der
 * Vortrag zur Ausstellung gehört und nicht zu einem eigenen Programm.
 *
 * Weiter mit →, Leertaste oder Klick auf die rechte Hälfte, zurück mit ← oder
 * einem Klick links; Pos1 und Ende springen an die Ränder. Die Foliennummer
 * steht in der Adresse, sodass ein Neuladen dieselbe Folie zeigt.
 */

/*
 * Der Satzspiegel der Folie. Die Website ist auf Lesegrößen eingestellt, ein
 * Vortrag wird aus zehn Metern gelesen: die Folie setzt deshalb ihre eigene
 * Grundgröße nach der Breite des Schirms, und alles darauf steht in `em` dazu.
 */
const SLIDE_TEXT = 'text-[clamp(15px,1.35vw,21px)]'

const Eyebrow = ({ children, no }: { children: React.ReactNode; no: number }) => (
  <p className="mb-4 text-[0.72em] font-semibold uppercase tracking-[0.18em] text-blue-400">
    {children} <span className="text-gray-500">· {no}</span>
  </p>
)

const H1 = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-[3.4em] font-bold leading-[1.08] text-gray-50">{children}</h1>
)

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-8 max-w-[24em] text-[2.1em] font-bold leading-[1.14] text-gray-50">
    {children}
  </h2>
)

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 text-[1.05em] font-semibold text-blue-400">{children}</h3>
)

const Lead = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-[30em] text-[1.18em] leading-snug text-gray-100">{children}</p>
)

const Muted = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`max-w-[34em] text-[0.95em] text-gray-400 ${className}`}>{children}</p>
)

/* Zwei Spalten, links der Text und rechts das Bild, oder zu gleichen Teilen. */
const Cols = ({
  children,
  even = false,
  className = '',
}: {
  children: React.ReactNode
  even?: boolean
  className?: string
}) => (
  <div
    className={`grid flex-1 content-start gap-10 ${
      even ? 'md:grid-cols-2' : 'md:grid-cols-[3fr_2fr]'
    } ${className}`}>
    {children}
  </div>
)

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-gray-700 bg-gray-800 p-5 ${className}`}>{children}</div>
)

/* Aufzählung mit dem Zeiger der Ausstellungsfarbe statt eines Punktes. */
const Plain = ({ children }: { children: React.ReactNode }) => (
  <ul className="space-y-2">{children}</ul>
)

const Item = ({ children }: { children: React.ReactNode }) => (
  <li className="relative max-w-[32em] pl-[1.4em] text-gray-200">
    <span className="absolute left-0 text-blue-400">▸</span>
    {children}
  </li>
)

/* Nummerierte Schritte, die Zahl im Kreis. */
const Steps = ({ children }: { children: React.ReactNode }) => (
  <ol className="space-y-4">{children}</ol>
)

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="relative max-w-[34em] pl-[2.8em] text-gray-200">
    <span className="absolute left-0 top-[0.15em] inline-flex h-[1.9em] w-[1.9em] items-center justify-center rounded-full border border-blue-700 font-mono text-[0.85em] text-blue-400">
      {n}
    </span>
    {children}
  </li>
)

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="whitespace-nowrap rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 font-mono text-[0.92em] text-gray-100">
    {children}
  </code>
)

/* Ein Terminal, so wie es auf dem Schirm steht. */
const Term = ({ children }: { children: React.ReactNode }) => (
  <pre className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-950 p-4 font-mono text-[0.82em] leading-relaxed text-gray-200">
    {children}
  </pre>
)

const Prompt = ({ children }: { children: React.ReactNode }) => (
  <span className="text-green-400">{children}</span>
)

const Comment = ({ children }: { children: React.ReactNode }) => (
  <span className="text-gray-500">{children}</span>
)

/* Eine Aufnahme mit Bildunterschrift. Breite und Höhe sind beide gedeckelt, so
   dass der Browser die größte Darstellung wählt, die in Spalte und Folie passt. */
const Photo = ({
  src,
  alt,
  caption,
  className = '',
}: {
  src: string
  alt: string
  caption?: React.ReactNode
  className?: string
}) => (
  <figure className={`self-start ${className}`}>
    <img src={src} alt={alt} className="h-auto max-h-[55svh] w-auto max-w-full rounded-lg" />
    {caption && (
      <figcaption className="mt-2 max-w-[30em] text-[0.8em] text-gray-400">{caption}</figcaption>
    )}
  </figure>
)

const slides: React.ReactNode[] = [
  /* 1 · Titel */
  <>
    <p className="mb-4 text-[0.72em] font-semibold uppercase tracking-[0.18em] text-blue-400">
      Classic Computing 2026 · Celle
    </p>
    <H1>FotoFix</H1>
    <div className="mt-6">
      <Lead>
        Ein Kunstprojekt auf der CC 2026
        <br />
        Besucher fotografieren sich mit der Indy
        <br />
        Euer Exponat zeigt die Bilder.
      </Lead>
    </div>
    <p className="mt-8 font-mono text-gray-400">56 Formate · FTP · SMB · DECnet · seriell</p>
    <Photo
      className="mt-10 [&>img]:max-h-[33svh]"
      src="/fotofix/bilder/a1.jpg"
      alt="SGI Indy von vorn, IndyCam obenauf"
    />
  </>,

  /* 2 · Der Automat */
  <>
    <Eyebrow no={2}>Worum geht es</Eyebrow>
    <H2>Der Automat</H2>
    <Cols even>
      <div>
        <Steps>
          <Step n={1}>Besucher stellen sich vor die Indy - der Sucher zeigt die Aufnahme.</Step>
          <Step n={2}>
            <span className="text-red-400">Rote Taste:</span> Countdown
            3&nbsp;·&nbsp;2&nbsp;·&nbsp;1 mit Ton, das Bild friert ein.
          </Step>
          <Step n={3}>
            <span className="text-green-400">Grüne Taste:</span> Foto behalten - der Laufzettel
            rollt aus dem Bondrucker.
          </Step>
        </Steps>
        <Muted className="mt-6">
          SGI Indy mit IndyCam von 1993, Aufnahme 640&nbsp;×&nbsp;480. Selbstbedienung in vier
          Sprachen; nach jedem Foto steht wieder Deutsch da.
        </Muted>
        <Muted className="mt-4">
          Zwischen den Besuchern zeigt der Sucher bekannte Gesichter, umgerechnet in die Formate der
          alten Rechner.
        </Muted>
      </div>
      <Photo
        src="/fotofix/bilder/automat.jpg"
        alt="Ein Besucher von schräg hinten vor dem Automaten: auf dem Schirm das Livebild mit der Anleitung ringsum, die IndyCam obenauf, die Indy darunter, die Hand auf der Tastenbox"
        caption="Der Prototyp im Betrieb - der Sucher erklärt sich selbst, die Hand liegt auf der roten Taste."
      />
    </Cols>
  </>,

  /* 3 · Der Laufzettel */
  <>
    <Eyebrow no={3}>Worum geht es</Eyebrow>
    <H2>Der Laufzettel</H2>
    <div className="flex min-h-0 flex-1 flex-col gap-10 md:flex-row">
      <img
        src="/fotofix/laufzettel-render.png"
        alt="Beispiel-Laufzettel: Foto, Erläuterung, QR-Code und Foto-ID auf Thermopapier"
        className="h-auto max-h-[62svh] w-auto max-w-full rounded shadow-2xl"
      />
      <div>
        <Plain>
          <Item>Das Foto, gedithert für Thermopapier</Item>
          <Item>QR-Code zur eigenen Foto-Seite im Web</Item>
          <Item>
            Die <strong>Foto-ID</strong> besteht aus sechs Zeichen, z.&nbsp;B. <Code>K7NP4M</Code>{' '}
            und ist der Schlüssel zu allem Weiteren
          </Item>
          <Item>
            Der <strong>Code</strong>, mit dem das Foto wieder gelöscht werden kann
          </Item>
          <Item>
            Kästchen mit <strong>Tischnummern</strong> - dazu gleich mehr
          </Item>
        </Plain>
        <Muted className="mt-6">
          80&nbsp;mm Thermopapier auf Kassendrucker. Der Ausdruck dauert wenige Sekunden.
        </Muted>
      </div>
    </div>
  </>,

  /* 4 · Die Idee */
  <>
    <Eyebrow no={4}>Worum geht es</Eyebrow>
    <H2>Die Idee: der Laufzettel schickt Besucher an Eure Tische</H2>
    <Cols>
      <Steps>
        <Step n={1}>Besucher fotografieren sich am Eingang und bekommen den Laufzettel.</Step>
        <Step n={2}>
          Die Tischnummern darauf sind Exponate, die das Foto anzeigen können - die Besucher gehen
          hin und tippen ihre ID ein oder geben sie dem Aussteller.
        </Step>
        <Step n={3}>
          Für jedes besuchte Exponat gibt es einen <strong>Stempel</strong> ins Kästchen - jeder
          Aussteller hat seinen eigenen.
        </Step>
        <Step n={4}>
          Pro Stempel ein <strong>Gummibärchen (?)</strong> am Infotresen.
        </Step>
      </Steps>
      <div className="grid content-start gap-5">
        <p className="max-w-[24em] text-[1.35em] font-semibold leading-snug text-gray-50">
          Das Projekt bringt Publikum an Euren Tisch - mit einem Grund, zu bleiben.
        </p>
        <Muted>
          Stempel fertigen wir Ende September an und bringen sie zur CC mit. Ihr könnt gern Euren
          eigenen Logo-Wunsch anbringen.
        </Muted>
      </div>
    </Cols>
  </>,

  /* 5 · Der Server */
  <>
    <Eyebrow no={5}>Was wir liefern</Eyebrow>
    <H2>Der Server: eine ID, ein Verzeichnis, 56 Formate</H2>
    <Cols>
      <div>
        <p className="max-w-[34em] text-gray-200">
          Ein Raspberry Pi nimmt jedes Foto an, druckt den Laufzettel und konvertiert dann
          automatisch. Jede Foto-ID ist ein Verzeichnis mit festen, vorhersagbaren Namen:
        </p>
        <div className="mt-5">
          <Term>
            {'K7NP4M/photo.jpg             '}
            <Comment>das Original, 640 × 480</Comment>
            {'\nK7NP4M/c64.prg               '}
            <Comment>C64, läuft mit LOAD und RUN</Comment>
            {'\nK7NP4M/amiga-ham.adf         '}
            <Comment>bootfähige Amiga-Diskette</Comment>
            {'\nK7NP4M/apple2-hgr-color.dsk  '}
            <Comment>bootfähige Apple-II-Diskette</Comment>
            {'\nK7NP4M/ascii-terminal.txt    '}
            <Comment>für jedes Terminal</Comment>
            {'\n…                            '}
            <Comment>und 52 weitere</Comment>
          </Term>
        </div>
        <Muted className="mt-4">
          Es gibt keine Suche und keinen Index. Ohne ID kann man keine Fotos abrufen.
        </Muted>
      </div>
      <Photo
        src="/fotofix/bilder/a5.jpg"
        alt="Raspberry Pi im Gehäuse auf dem Deckel der Indy"
        caption="Der Server steht auf der Indy: 30 Jahre Abstand, ein Netzwerkkabel."
      />
    </Cols>
  </>,

  /* 6 · Die Zugangswege */
  <>
    <Eyebrow no={6}>Was wir liefern</Eyebrow>
    <H2>Die Zugangswege</H2>
    <Cols>
      <div>
        <table className="w-full border-collapse text-[0.95em]">
          <thead>
            <tr className="text-[0.78em] uppercase tracking-widest text-gray-400">
              <th className="border-b border-gray-700 py-2 pr-6 text-left font-semibold">
                Protokoll
              </th>
              <th className="border-b border-gray-700 py-2 pr-6 text-left font-semibold">
                Adresse
              </th>
              <th className="border-b border-gray-700 py-2 text-left font-semibold">Anmeldung</th>
            </tr>
          </thead>
          <tbody className="text-gray-200">
            <tr>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">FTP</td>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">
                <Code>fotofix</Code>, Port 21
              </td>
              <td className="border-b border-gray-800 py-2 align-top">anonymous, ohne Passwort</td>
            </tr>
            <tr>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">HTTP</td>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">
                <Code>http://fotofix.classic-computing.de/K7NP4M/</Code>
              </td>
              <td className="border-b border-gray-800 py-2 align-top">keine</td>
            </tr>
            <tr>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">SMB</td>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">
                <Code>{'\\\\FOTOFIX\\fotos'}</Code>
              </td>
              <td className="border-b border-gray-800 py-2 align-top">Gast</td>
            </tr>
            <tr>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">DECnet</td>
              <td className="border-b border-gray-800 py-2 pr-6 align-top">
                <Code>{'FOTOFX::"K7NP4M/photo.jpg"'}</Code>, Knoten 1001
              </td>
              <td className="border-b border-gray-800 py-2 align-top">beliebig</td>
            </tr>
            <tr>
              <td className="py-2 pr-6 align-top">Seriell</td>
              <td className="py-2 pr-6 align-top">Terminalserver am Tisch</td>
              <td className="py-2 align-top">Kermit, X/Y/ZModem</td>
            </tr>
          </tbody>
        </table>
        <Muted className="mt-6">
          Bereitgestellt im CC-Netz: 10BASE5-Backbone, 10BASE-T- und WLAN-Segmente sowie serielle
          Schnittstellen. Der Name gilt auch von zu Hause aus - über HTTP aus dem Internet, für die
          übrigen Wege im Retrostar-Netz.
        </Muted>
      </div>
      <Photo
        src="/fotofix/bilder/c1.jpg"
        alt="Aufgerolltes Yellow Cable mit DEC-H4005-Transceiver und Bohrwerkzeug für die Vampirklemme"
        caption="Das Backbone ist selbst ein Exponat: 10BASE5, Transceiver H4005, Bohrer für die Vampirklemme."
      />
    </Cols>
  </>,

  /* 7 · Die Formate */
  <>
    <Eyebrow no={7}>Was wir liefern</Eyebrow>
    <H2>Ein Gesicht, viele Systeme</H2>
    <p className="max-w-[44em] text-gray-200">
      Die Zielmaschine braucht kein Bildprogramm - laden, starten, fertig.
    </p>
    <div className="mt-5 grid gap-8 text-[0.92em] md:grid-cols-3">
      <Plain>
        <Item>
          C64 - <Code>.prg</Code>
        </Item>
        <Item>
          MS-DOS - <Code>.com</Code> für CGA, Hercules, VGA
        </Item>
        <Item>
          Atari ST - <Code>.tos</Code>
        </Item>
        <Item>
          Amiga - <Code>.iff</Code> + 5 bootfähige <Code>.adf</Code>
        </Item>
        <Item>
          Apple II - bootfähige <Code>.dsk</Code>
        </Item>
      </Plain>
      <Plain>
        <Item>
          TI-99/4A - Modul <Code>.rpk</Code>
        </Item>
        <Item>
          Atari 2600 - Cartridge <Code>.a26</Code>
        </Item>
        <Item>
          MSX - Cartridge <Code>.rom</Code>
        </Item>
        <Item>
          Amstrad/Schneider CPC - <Code>.rom</Code>
        </Item>
        <Item>
          NKC mit GDP64 - <Code>.pbm</Code> für KERMIMG
        </Item>
      </Plain>
      <Plain>
        <Item>ASCII-Art - Terminal &amp; Zeilendrucker</Item>
        <Item>Tektronix 4010/4014 - Vektorgrafik</Item>
        <Item>VT240/VT241 - Sixel</Item>
        <Item>
          Minitel 1B - Télétel-Seite <Code>.vdt</Code>
        </Item>
        <Item>
          Bildschirmtext - CEPT-Seite <Code>.cept</Code>
        </Item>
      </Plain>
    </div>
    <Muted className="mt-5 max-w-[52em]">
      Dazu die Austauschformate für Maschinen mit eigenem Bildlader: PNG, GIF, PCX, PPM/PGM/PBM, XBM
      - und für den NEC Pinwriter P6 ein fertiger Druckauftrag auf A4. Fehlt eines? Sagt uns, was
      Eure Maschine liest - die Konvertierung baut das Projekt.
    </Muted>
    <figure className="mt-6 self-start">
      <div className="grid w-[min(100%,112svh)] grid-cols-3 gap-2">
        <img
          src="/fotofix/bilder/viewer-amiga.png"
          alt="Konrad Zuse auf dem Amiga, HAM6 in vollen Farben"
          className="rounded"
        />
        <img
          src="/fotofix/bilder/viewer-c64.png"
          alt="Konrad Zuse auf dem C64, gedithert in Schwarzweiß"
          className="rounded"
        />
        <img
          src="/fotofix/bilder/viewer-ti994a.png"
          alt="Konrad Zuse auf dem TI-99/4A in Farbe"
          className="rounded"
        />
      </div>
      <figcaption className="mt-2 text-[0.8em] text-gray-400">
        Jedes Bild trägt Bildunterschrift und Systemnamen.
      </figcaption>
    </figure>
  </>,

  /* 8 · Website und Datenschutz */
  <>
    <Eyebrow no={8}>Was wir liefern</Eyebrow>
    <H2>Website und Datenschutz</H2>
    <div className="flex min-h-0 flex-1 flex-col gap-10 md:flex-row">
      <img
        src="/fotofix/bilder/foto-seite.jpg"
        alt="Die Foto-Seite im Browser: Bild, Downloads nach Systemen geordnet, die Tische des Laufzettels und das Lösch-Formular"
        className="h-auto max-h-[62svh] w-auto max-w-full rounded shadow-2xl"
      />
      <div>
        <Plain>
          <Item>
            Der QR-Code führt zur eigenen Foto-Seite: das Bild, alle Downloads, die Tische des
            Laufzettels
          </Item>
          <Item>
            Besucher können ihr Foto dort <strong>selbst löschen</strong> - der Lösch-Code steht auf
            dem Laufzettel
          </Item>
          <Item>
            Fotos liegen ausschließlich auf dem Ausstellungs-Server; die Indy löscht jede Aufnahme
            nach der Übertragung
          </Item>
          <Item>
            Drei Monate nach der Ausstellung wird alles gelöscht, auch ohne Zutun der Besucher
          </Item>
          <Item>
            Datenschutzerklärung unter <Code>/foto/datenschutz</Code>, verlinkt auf jeder Seite
          </Item>
        </Plain>
        <p className="mt-8 max-w-[24em] text-[1.35em] font-semibold leading-snug text-gray-50">
          Die Datenschutz-Frage am Tisch ist beantwortet, bevor sie gestellt wird.
        </p>
        <Muted className="mt-4">
          Ihr müsst nichts speichern, nichts weitergeben und nichts löschen - auf Eurem Exponat
          liegt nur das Bild, das gerade angezeigt wird.
        </Muted>
      </div>
    </div>
  </>,

  /* 9 · Eure Aufgabe */
  <>
    <Eyebrow no={9}>Mitmachen</Eyebrow>
    <H2>Eure Aufgabe: ID abrufen, Foto zeigen</H2>
    <Cols>
      <div>
        <p className="max-w-[34em] text-gray-200">
          Ein Besucher kommt mit dem Laufzettel an Euren Tisch und nennt seine ID. Euer Exponat holt
          das Foto und zeigt es an - Protokoll und Format wählt Ihr passend zur Maschine.
        </p>
        <div className="mt-5">
          <Term>
            <Prompt>$</Prompt>
            {' ftp fotofix\nName: anonymous\n'}
            <Prompt>ftp&gt;</Prompt>
            {' get K7NP4M/amiga-ham.adf\n'}
            <Comment>… Diskette schreiben, booten - das Foto steht auf dem 1084er</Comment>
          </Term>
        </div>
        <Muted className="mt-4">
          Ihr ruft das Bild ab und zeigt es an. Alles davor - Aufnahme, Konvertierung, Verteilung -
          ist erledigt.
        </Muted>
      </div>
      <Photo
        src="/fotofix/bilder/hans-on-nkc.jpg"
        alt="Bildschirm eines NKC mit GDP64-Grafikkarte, darauf ein gedithertes Porträt, oben „Classic Computing 2026 – Celle“"
        caption="So sieht das aus: ein NKC mit GDP64 zeigt ein Foto vom Automaten - kein Emulator, echte Hardware."
      />
    </Cols>
  </>,

  /* 10 · Beteiligungsstufen und Test */
  <>
    <Eyebrow no={10}>Mitmachen</Eyebrow>
    <H2>Für jedes Exponat ein Weg - und einer zum Üben</H2>
    <Cols even>
      <div className="grid content-start gap-2">
        <Card>
          <H3>Maschine im Netz</H3>
          <p className="text-gray-300">
            FTP, SMB, HTTP oder DECnet direkt - Foto abrufen und anzeigen.
          </p>
        </Card>
        <Card>
          <H3>Maschine mit serieller Schnittstelle</H3>
          <p className="text-gray-300">
            Über den Terminalserver einwählen, Foto per Kermit oder X/Y/ZModem holen.
          </p>
        </Card>
        <Card>
          <H3>Maschine ohne alles</H3>
          <p className="text-gray-300">
            Am Tisch eine Diskette oder ein Modul beschreiben - <Code>.adf</Code>, <Code>.dsk</Code>
            , <Code>.rom</Code> booten von selbst.
          </p>
        </Card>
        <Card>
          <H3>Bonus: Exponat mit Drucker</H3>
          <p className="text-gray-300">Das Foto als Ausdruck mitgeben - ein zweites Andenken.</p>
        </Card>
      </div>
      <div className="grid content-start gap-2">
        <p className="text-gray-200">
          Ihr könnt alles von zu Hause aus vor der Ausstellung ausprobieren:
        </p>
        <Card>
          <H3>
            Die Test-ID <Code>MUSTER</Code>
          </H3>
          <p className="text-gray-300">
            Ein Beispielfoto in allen Formaten, ab sofort abrufbar unter{' '}
            <Code>fotofix.classic-computing.de</Code>. Damit baut Ihr Euren Abrufweg, bevor der
            erste Besucher vor der Kamera steht.
          </p>
        </Card>
        <Card>
          <H3>Der Automat im Browser</H3>
          <p className="text-gray-300">
            Die Kamera-Seite in Exhibitron ist die Fotostation als Webseite: Foto machen, eigene ID
            bekommen, alle Formate werden erzeugt.
          </p>
        </Card>
        <Card>
          <H3>
            Die serielle Strecke: <Code>fotofix-serial</Code>
          </H3>
          <p className="text-gray-300">
            Ihr schließt Euren Retro-Rechner an die serielle Schnittstelle eines Internet-fähigen
            Rechners an, der sich mit unserem Bridge-Programm so verhält wie der serielle Port auf
            der CC. Die Bridge läuft im Browser (Chrome oder Firefox) oder unter Linux/Windows/macOS
            nativ.
          </p>
        </Card>
      </div>
    </Cols>
  </>,

  /* 11 · Aufruf */
  <>
    <Eyebrow no={11}>Mitmachen</Eyebrow>
    <H2>Macht Euer Exponat zum Fotorahmen.</H2>
    <div className="grid gap-10 md:grid-cols-2">
      <Card>
        <h3 className="mb-2 text-[1.05em] font-semibold text-red-400">Ihr bringt</h3>
        <p className="text-gray-300">Euer Exponat und eine Abruf-Idee.</p>
      </Card>
      <Card>
        <h3 className="mb-2 text-[1.05em] font-semibold text-blue-400">Wir liefern</h3>
        <p className="text-gray-300">
          Automat, Server, Netz, Euer Format, die Testumgebung und die Besucher mit dem Laufzettel
          in der Hand.
        </p>
      </Card>
    </div>
    <div className="mt-10 grid gap-10 md:grid-cols-2">
      <div>
        <H3>Anmeldung</H3>
        <Plain>
          <Item>Tischnummer für den Laufzettel melden</Item>
          <Item>Stempel bestellen, gern mit eigenem Logo</Item>
          <Item>
            Anmeldeschluss: <span className="text-gray-400">25. September 2026</span>
          </Item>
        </Plain>
      </div>
      <div>
        <H3>Kontakt</H3>
        <Muted>hans@huebner.org</Muted>
        <p className="mt-6 font-mono text-gray-400">Fragen?</p>
      </div>
    </div>
  </>,
]

const slideFromHash = () => {
  const n = parseInt(window.location.hash.slice(1), 10)
  if (!Number.isInteger(n)) return 0
  return Math.min(slides.length - 1, Math.max(0, n - 1))
}

const Praesentation = () => {
  const [index, setIndex] = useState(slideFromHash)

  const go = useCallback((n: number) => {
    setIndex(Math.min(slides.length - 1, Math.max(0, n)))
  }, [])

  useEffect(() => {
    window.history.replaceState(null, '', `#${index + 1}`)
  }, [index])

  /* Eine getippte oder verlinkte Foliennummer führt auf die Folie. Das
     replaceState oben löst kein hashchange aus, die beiden treiben sich also
     nicht gegenseitig. */
  useEffect(() => {
    const onHash = () => setIndex(slideFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setIndex((i) => Math.min(slides.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'Home') {
        setIndex(0)
      } else if (e.key === 'End') {
        setIndex(slides.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Ein Klick blättert, sofern er nicht einem Link oder einem Stück Text gilt,
     das man beim Vorlesen zeigt. */
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, code, pre')) return
    go(e.clientX > window.innerWidth / 2 ? index + 1 : index - 1)
  }

  return (
    <div
      onClick={onClick}
      className="min-h-svh cursor-pointer select-none bg-gray-900 text-gray-100">
      <section className={`flex min-h-svh flex-col px-[6vw] pb-16 pt-14 ${SLIDE_TEXT}`}>
        {slides[index]}
      </section>
      <footer className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-between px-8 py-3 font-mono text-sm text-gray-500">
        <Link to="/" className="pointer-events-auto hover:text-gray-300">
          FotoFix · Classic Computing 2026
        </Link>
        <span>
          {index + 1} / {slides.length}
        </span>
      </footer>
    </div>
  )
}

export default Praesentation
