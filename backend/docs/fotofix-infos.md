# Exponat anschließen

Ein Besucher kommt mit seinem Laufzettel an Euren Tisch und nennt eine sechsstellige Foto-ID. Euer
Exponat holt das Bild und zeigt es an. Diese Seite sagt, was dafür bereitsteht und wie Ihr es heute
schon ausprobiert.

## Kurz gesagt

Der Dateiserver heißt `fotofix.classic-computing.de`. Jede Foto-ID ist dort ein Verzeichnis, und
darin liegt dasselbe Bild in 64 Formaten unter festen Namen:

```
K7NP4M/photo.jpg            das Original, 640 × 480
K7NP4M/c64.prg              LOAD und RUN, Bild steht
K7NP4M/amiga-ham.adf        bootfähige Diskette
K7NP4M/ascii-terminal.txt   80 × 24, für jedes Terminal
```

Abgeholt wird über FTP, HTTP, SMB, DECnet oder eine serielle Leitung. Die Foto-ID vom Laufzettel ist
dabei der Schlüssel: mit ihr steht das Verzeichnis offen, und darin listet und holt jedes Protokoll
wie gewohnt.

## Was Ihr braucht

**Ihr bringt mit**

- Ein Exponat, das ein Bild anzeigen kann.
- Einen Weg an die Datei: Netzwerkkarte, serielle Schnittstelle, oder eine Diskette, die Ihr am
  Tisch beschreibt.
- Euren Tisch, hier als Foto-Tisch markiert, und einen Stempel für das Kästchen daneben.

**Wir stellen bereit**

- Den Automaten am Eingang und die Besucher mit dem Zettel in der Hand.
- Den Dateiserver mit allen Formaten, im Netz und seriell.
- Eine Testumgebung, gegen die Ihr ab sofort von zu Hause aus arbeiten könnt.
- Die Umrechnung in Euer Format — sagt uns, was Eure Maschine liest.

Bei Euch bleiben zwei Schritte übrig: die Datei holen und sie anzeigen. Aufnahme, Umrechnung und
Verteilung sind erledigt, bevor der Besucher an Euren Tisch kommt.

## Zugangswege

Fünf Wege auf dieselben Dateien. Der Name `fotofix.classic-computing.de` gilt dabei überall: aus dem
Internet beantwortet ihn der Server der Ausstellungswebsite, im Retrostar und in der Halle die
Maschine vor Ort. Eine einmal getippte HTTP-Zeile funktioniert damit vorher wie nachher.

| Protokoll | Adresse                                       | Anmeldung                | Erreichbar                                       |
| --------- | --------------------------------------------- | ------------------------ | ------------------------------------------------ |
| HTTP      | `http://fotofix.classic-computing.de/K7NP4M/` | ohne                     | aus dem Internet, im Retrostar und in der Halle  |
| FTP       | `fotofix`, Port 21                            | anonymous, Passwort frei | im Retrostar und in der Halle                    |
| SMB       | `\\FOTOFIX\fotos\K7NP4M`                      | Gast                     | im Retrostar und in der Halle, SMB1 über NetBIOS |
| DECnet    | `FOTOFX::"K7NP4M/photo.jpg"`                  | frei wählbar             | im Retrostar und in der Halle, Knoten 1001       |
| Seriell   | Terminalserver am Tisch                       | Konto `foto`             | in der Halle, von zu Hause über die Brücke       |

HTTP genügt, um Euren Abrufweg zu bauen: Pfade und Dateinamen sind dieselben, die FTP, SMB und
DECnet ausliefern. Wer im Retrostar ist, prüft zusätzlich das Protokoll, das sein Exponat später
wirklich spricht.

Neben den Fotos steht das Retro-Dateiarchiv bereit: über HTTP unter `/pub/`, über SMB als Freigabe
`ftp`.

## Dateien und Namen

Jede Foto-ID ist ein Verzeichnis. Darin liegt das Original als `photo.jpg`, und daneben liegen 64
Umrechnungen davon. Jede trägt einen festen Namen, der die Zielmaschine nennt — drei Ziele schreiben
`.com`, fünf `.adf` und vier `.dsk`, der Name entscheidet also.

| System                | Dateien                                                                                                                                                                       | Was drin ist                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commodore C64         | `c64.prg`, `c64-hires-raw.prg`, `c64-grey.prg`, `c64-grey-raw.prg`, `c64-koala.koa`, `c64-koala-prg.prg`, `c64-petscii.prg`, `c64-petscii-text.txt`                                                | Hi-res 320 × 200 monochrom als Programm und als nacktes Bitmap ab `$2000`; Multicolor 160 × 200 in vier Graustufen, gepackt mit Anzeiger und ebenfalls nackt ab `$2000`; Koala Painter in allen sechzehn Farben als `.koa` und mit Anzeiger davor; farbiges PETSCII als BASIC-Programm und als reiner Zeichenstrom, den ein Terminalprogramm auf den Schirm schreibt |
| MS-DOS                | `cga.com`, `mga.com`, `vga.com`                                                                                                                                               | 640 × 200 mono · Hercules 720 × 348 · Mode 13h 320 × 200 × 256                                                                                                                                                                                                                                                                                                         |
| Atari ST              | `atari-st.tos`                                                                                                                                                                | GEMDOS-Programm, 320 × 200 × 16                                                                                                                                                                                                                                                                                                                                        |
| Amiga                 | `amiga.iff`, `amiga-lores.adf`, `amiga-lores-lace.adf`, `amiga-hires.adf`, `amiga-hires-lace.adf`, `amiga-ham.adf`                                                            | IFF ILBM für Multiview; dazu fünf bootfähige Disketten mit eigenem Bootblock — lo-res, hi-res, interlaced und HAM6, alle PAL                                                                                                                                                                                                                                           |
| Apple II              | `apple2-hgr-mono.dsk`, `apple2-hgr-color.dsk`, `apple2-dhgr-mono.dsk`, `apple2-dhgr-color.dsk`                                                                                | bootfähige Disketten; DHGR läuft auf dem IIe mit 128K                                                                                                                                                                                                                                                                                                                  |
| TI-99/4A              | `ti994a.rpk`                                                                                                                                                                  | 32-KB-Modul, TMS9918A-Bitmap, Menü mono/farbig                                                                                                                                                                                                                                                                                                                         |
| Atari 2600            | `atari2600-mono.a26`, `atari2600-color.a26`                                                                                                                                   | 4-KB-Cartridge, Playfield im Strahlentakt, 40 × 192                                                                                                                                                                                                                                                                                                                    |
| MSX                   | `msx.rom`                                                                                                                                                                     | 256-KB-Cartridge, erkennt MSX1/2/2+/turbo R, SCREEN 2/8/12                                                                                                                                                                                                                                                                                                             |
| Amstrad/Schneider CPC | `cpc.rom`, `cpc-mono.rom`                                                                                                                                                     | 16-KB-Erweiterungs-ROM mit Autostart, Mode 0 und Mode 2                                                                                                                                                                                                                                                                                                                |
| Terminals             | `ascii-terminal.txt`, `ascii-terminal-full.txt`, `ascii-tono.txt`, `vt240.six`, `vt241.six`, `tektronix-4010.tek`, `tektronix-4014.tek`, `tektronix-trace-4010.tek`, `tektronix-trace-4014.tek`, `minitel.vdt`, `minitel-mono.vdt`, `btx.cept`, `btx-basic.cept`, `btx-drcs.cept`, `btx-drcs-double.cept` | ASCII-Kunst 80 × 24 in zwei Zeichenvorräten und 32 × 16 für das TONO, jedes Zeichen nach der Form gewählt, die sein Tintenmuster in der Zelle macht; Sixel 800 × 240 in vier Graustufen bzw. vier Farben; Speicherröhre als Schraffur oder als Umrisszeichnung; Télétel-Seiten für das Minitel 1B und CEPT-Seiten für den BTX-Decoder, die das Terminal beim Empfang aufbaut — 80 × 66 Mosaikblöcke über den ganzen Schirm, die DRCS-Fassungen mit eigenem Zeichensatz und damit einem echten 144 × 70-Bitmap |
| Drucker               | `ascii-print-80.prn`, `ascii-print-80-full.prn`, `ascii-print-132.prn`, `ascii-print-132-full.prn`, `nec-p6-60.prn` … `nec-p6-360.prn`                                        | ASCII-Kunst für 80 und 132 Spalten, mit Überdruck für mehr Graustufen; für den NEC Pinwriter P6 ein fertiger Druckauftrag auf A4 in fünf Dichten — an den Drucker schicken, Blatt kommt heraus                                                                                                                                                                         |
| Bildformate           | `photo.jpg`, `png.png`, `gif.gif`, `pcx_1tek.pcx`, `pcx-color.pcx`, `ppm-24.ppm`, `ppm-16.ppm`, `ppm-8.ppm`, `ppm-48.ppm`, `pgm-8.pgm`, `pbm.pbm`, `xbm.xbm`, `nkc-gdp64.pbm`                                    | 640 × 480 für jede Maschine mit eigenem Bildlader; XBM als C-Quelle, die ein X-Client übersetzen kann; `nkc-gdp64.pbm` ist 512 × 256 mono für den KERMIMG-Anzeiger im ROM des NKC |

Jeder mitgelieferte Anzeiger schreibt zwei Bildunterschriften im Zeichensatz der Zielmaschine: oben
links „Classic Computing 2026 – Celle“, unten rechts den Systemnamen. Die Bildformate sind das
Foto allein.

Jedes Programm hält sein Bild, bis eine Taste, ein Joystick in einem der beiden Ports oder eine
Maustaste etwas anderes sagt, und gibt die Maschine dann zurück: BASIC auf C64, CPC und MSX, DOS auf
dem PC, der Desktop auf dem ST, Applesoft auf dem Apple II, der Titelbildschirm auf dem TI. Der Amiga
startet neu — mehr hat ein Bootblock nicht.

## Von zu Hause testen

### Die Test-ID `MUSTER`

Unter dieser ID liegt dauerhaft ein Beispielfoto in allen Formaten. Damit baut Ihr Euren Abrufweg,
lange bevor der erste Besucher vor der Kamera steht.

```
# HTTP — von überall, auch ohne Retrostar
$ curl -O http://fotofix.classic-computing.de/MUSTER/c64.prg
$ lynx http://fotofix.classic-computing.de/MUSTER/
```

Damit steht der Abrufweg: Pfad und Dateiname sind hier dieselben, die Euer Exponat später am Tisch
verlangt. Wer im Retrostar ist, prüft dazu das Protokoll, das die Maschine wirklich spricht:

```
# FTP — binary für Programme und Bilder
$ ftp fotofix
Name: anonymous
Password: (beliebig)
ftp> cd MUSTER
ftp> binary
ftp> get amiga-ham.adf
#   ascii statt binary liefert Textdateien mit CRLF —
#   so, wie ein DOS- oder CP/M-Client sie erwartet

# SMB — als Gast
$ smbclient //FOTOFIX/fotos -N -c 'cd MUSTER; get msx.rom'
```

### Ein eigenes Testfoto machen

Im Ausstellerbereich gibt es unter [Web-Kamera](/foto/kamera) den Automaten als Webseite: Foto mit
der Webcam aufnehmen, ID bekommen, und der Server rechnet dieselben 64 Formate daraus. Die Dateien
landen im selben Verzeichnisbaum — Euer Exponat holt Euer Testfoto genauso ab wie später das eines
Besuchers.

### Das Retrostar-Netz

FTP, SMB und DECnet arbeiten auf der Ebene, auf der auch die Halle zusammenhängt, und leben deshalb
im Retrostar-Netz des VzEkC, in dem der Fotoserver mit einer Bridge steht. Wer dort drin ist,
erreicht ihn von zu Hause aus unter denselben Namen wie später am Tisch: `fotofix`, `\\FOTOFIX` und
`FOTOFX::`. Status und Zugang:
[retrostar.classic-computing.de](https://retrostar.classic-computing.de/). Bei Fragen meldet Euch
per E-Mail an [hans@huebner.org](mailto:hans@huebner.org) oder im
[Thread im Forum](https://forum.classic-computing.de/forum/index.php?thread/40431-fotofix-pr%C3%A4sentation-informationen-f%C3%BCr-aussteller/).

## DECnet im Detail

Der Knoten heißt **FOTOFX** und trägt die Nummer **1001**. Tragt ihn einmal in Eure Knotendatenbank
ein, dann nimmt jedes Kommando den Namen an:

```
$ MCR NCP
NCP> DEFINE NODE 1001 NAME FOTOFX   ! in die Datenbank auf Platte
NCP> SET NODE 1001 NAME FOTOFX      ! sofort gültig
NCP> SHOW NODE FOTOFX
NCP> EXIT
```

`DEFINE` schreibt den Eintrag auf Platte, sodass er den nächsten Systemstart überlebt; `SET` macht
ihn in der laufenden Sitzung gültig. Die Nummer allein tut es auch — `1001::` steht überall dort, wo
`FOTOFX::` steht.

```
$! Dateien einer ID auflisten
$ DIRECTORY FOTOFX::"MUSTER/*"

$! Foto holen — der Zielname steht ausgeschrieben da
$ COPY FOTOFX::"MUSTER/photo.jpg" PHOTO.JPG

$! ASCII-Kunst direkt auf das Terminal
$ TYPE FOTOFX::"MUSTER/ascii-terminal.txt"

$! ... und dasselbe über die Knotennummer
$ COPY 1001::"MUSTER/c64.prg" C64.PRG
```

Worauf es bei der Dateiangabe ankommt:

| Regel                                                 | Wirkung                                                                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Die Angabe ist ein Pfad in Anführungszeichen          | `FOTOFX::"MUSTER/photo.jpg"` — so liest DCL den Schrägstrich als Teil des Namens, und die Angabe erreicht den Server klein geschrieben, wie die Dateien auf der Platte heißen |
| Die Foto-ID ist der erste Pfadschritt                 | Innerhalb einer ID wirkt `*` wie gewohnt: `DIRECTORY FOTOFX::"MUSTER/*"`                                                                                                      |
| `COPY` braucht den Zielnamen                          | Der Name auf der eigenen Seite steht ausgeschrieben da: `COPY FOTOFX::"MUSTER/photo.jpg" PHOTO.JPG`. Ein `*` an dieser Stelle holt die Datei nicht                            |
| Jede Datei kommt als Bytestrom mit ihrer wahren Länge | Ein JPEG, ein Diskettenabbild oder ein ROM kommt Byte für Byte so an, wie es auf der Platte liegt                                                                             |
| Anmeldedaten sind frei wählbar                        | Der Server bedient jeden Client                                                                                                                                               |

## Serielle Strecke

Exponate mit serieller Schnittstelle holen ihr Foto über den Terminalserver in der Halle. Ein Port
meldet sich entweder mit einem `login` — Konto `foto`, Heimatverzeichnis sind die Fotos — oder
direkt mit einem **Kermit-Server**, für Maschinen, deren ganze Ausstattung ein Terminalprogramm ist.
Zum Übertragen liegen `kermit`, `sz`, `sx` und `sb` bereit.

### Von zu Hause: `fotofix-serial`

Damit Ihr das vorher üben könnt, gibt es eine Brücke. Euer Retro-Rechner behält sein Nullmodemkabel;
am anderen Ende steht statt des Terminalservers ein Rechner mit Internet, der die Bytes weiterträgt.
Was Ihr dabei zu sehen bekommt, ist dasselbe Image, das später in der Halle läuft.

```
Retro-Rechner ──Nullmodem──> USB-Seriell ──> Brücke ──Internet──> fotofix
```

Die Brücke läuft im Browser (Chrome oder Firefox, Web Serial) oder als einzelne Programmdatei unter
Linux, Windows und macOS. Beides findet Ihr unter [Seriell-Tester](/user/serial).

```
$ fotofix-serial --list
$ fotofix-serial --port /dev/ttyUSB0 --speed 9600 --format 8N1 \
                 --flow xonxoff --term vt100 --size 80x24
```

- Geschwindigkeit, Format und Flusskontrolle stellt Ihr an Eurer Seite ein — dort liegt das Kabel.
  Sie sind während der Sitzung umstellbar.
- Für Binärübertragungen über ein Dreidrahtkabel nehmt `sz -e` oder gleich Kermit: beide maskieren
  Steuerzeichen und kommen damit sauber durch XON/XOFF.
- Der Mitschnitt im Fenster zeigt den Datenstrom als das, was er ist: eine Zeile je Kermit-Paket
  oder eine Zeile je Textzeile mit benannten Steuerzeichen. Daran seht Ihr sofort, ob Server und
  Kabel zusammenspielen.

## Anmelden

**Euren Tisch meldet Ihr selbst an.** Auf der Seite Eures Tisches — und ebenso im
[Tischplan](/table) — steht das Kästchen „An diesem Tisch können Besucherfotos gezeigt werden“.
Sobald es gesetzt ist, trägt der Tischplan für Euren Tisch ein **F**, und seine Nummer wird auf die
Laufzettel gedruckt. Der Automat liest die Liste beim Drucken, ein Haken während der Ausstellung
wirkt also ab dem nächsten Zettel, und zurücknehmen könnt Ihr ihn genauso.

Von uns braucht Ihr zwei Dinge:

- **Euren Stempel** — jeder teilnehmende Aussteller bekommt einen eigenen, gern mit Eurem Logo. Wir
  lassen sie Ende September anfertigen und bringen sie mit.
- **Euer Format**, falls es noch fehlt — sagt uns, was Eure Maschine liest, dann bauen wir die
  Umrechnung.

**Stempelschluss: 25. September 2026.** Danach sind die Stempel in Auftrag.

Fragen: [hans@huebner.org](mailto:hans@huebner.org) oder
[Thread im Forum](https://forum.classic-computing.de/forum/index.php?thread/40431-fotofix-pr%C3%A4sentation-informationen-f%C3%BCr-aussteller/)

---

Die Fotos liegen auf dem Ausstellungsserver. Besucher löschen ihr Foto selbst über einen Code auf
dem Laufzettel, und drei Monate nach der Ausstellung wird der Bestand gelöscht. Die
Datenschutzerklärung steht unter [/foto/datenschutz](/foto/datenschutz).
