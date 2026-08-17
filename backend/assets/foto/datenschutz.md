# Datenschutzerklärung – Fotoautomat

## Verantwortliche Stelle

Verein zum Erhalt klassischer Computer e. V. (VzEkC e. V.)\
Hans Hübner\
Vorstandsvorsitzender\
Strelitzer Str. 63\
10115 Berlin

Bei Fragen zur Verarbeitung personenbezogener Daten genügt eine Nachricht an
[info@classic-computing.de](mailto:info@classic-computing.de).

## Fotoautomat und Datenverarbeitung

Im Eingangsbereich der Ausstellung steht ein Fotoautomat: eine SGI Indy aus dem Jahr 1993 mit
eingebauter Kamera. Wer den Fotoautomaten nutzen möchte, kann ein Foto aufnehmen, das Bild
unmittelbar auf dem Bildschirm ansehen und anschließend entscheiden, ob es ausgedruckt oder
verworfen wird.

Eine Aufnahme wird nur ausgelöst, wenn dafür eine Taste betätigt wird. Sie wird erst dauerhaft
gespeichert, wenn sie anschließend mit der grünen Taste zum Ausdruck freigegeben wird.

Wer lediglich vor dem Fotoautomaten steht, hinterlässt keine gespeicherten Daten. Das Sucherbild
wird ausschließlich im Arbeitsspeicher verarbeitet und nicht dauerhaft gespeichert.

## Verarbeitete Daten

Bei einem zum Ausdruck freigegebenen Foto entstehen folgende Daten:

- **Das Foto** in einer Auflösung von 640 × 480 Bildpunkten, so wie es auf dem Bildschirm zum
  Ausdruck freigegeben wurde.
- **Daraus erzeugte Fassungen**, insbesondere rund dreißig Dateiformate für historische Rechner
  sowie ein gerastertes Bild für den Belegdrucker.
- **Eine Foto-ID** aus sechs Zeichen sowie der Zeitpunkt der Aufnahme.
- **Der Hash eines Löschcodes** (SHA-256). Der Löschcode selbst wird nicht gespeichert, sondern
  steht ausschließlich auf dem ausgedruckten Beleg.

Es werden **keine Namen, E-Mail-Adressen oder Benutzerkonten** erhoben.

Die Aufnahme wird nicht mit anderen Daten der Ausstellung verknüpft, nicht biometrisch ausgewertet,
nicht zur Gesichtserkennung verwendet und nicht für Werbung genutzt. Eine automatisierte
Entscheidungsfindung findet nicht statt.

## Protokollierung des Webservers

Jeder Abruf der Webseite wird an zwei Stellen protokolliert: durch den Webserver selbst und durch
die dahinterliegende Anwendung. Beide Protokolle enthalten:

- Datum und Uhrzeit
- die abgerufene Adresse, einschließlich `/foto/<Foto-ID>`
- HTTP-Methode und Statuscode
- die Anzahl der übertragenen Bytes
- die verweisende Seite
- die Browserkennung

**Die vollständige IP-Adresse wird nicht gespeichert.** Der Webserver schreibt an ihrer Stelle einen
Strich. Die Anwendung speichert die IP-Adresse lediglich in gekürzter Form auf Netzebene. Aus
`203.0.113.47` wird beispielsweise `203.0.113.0`.

Diese Kürzung dient insbesondere dazu, eine ungewöhnliche Häufung von Anfragen erkennen und von
einer normalen Nutzung unterscheiden zu können. Eine Zuordnung zu einem einzelnen Internetanschluss
ist anhand der gespeicherten gekürzten Adresse nicht ohne zusätzliche Informationen möglich.

Die fehlende Speicherung vollständiger IP-Adressen ist insbesondere deshalb relevant, weil die
Foto-ID Bestandteil der Webadresse ist. Eine vollständige IP-Adresse könnte dadurch einen
zusätzlichen Bezug zwischen einer Person und einem Foto herstellen, etwa beim Aufruf einer
Löschseite.

Die Protokolle werden nach **14 Tagen gelöscht**. Sie werden nicht zu
anderen Zwecken ausgewertet, nicht mit anderen Daten zusammengeführt
und nicht an Dritte weitergegeben. Sie dienen ausschließlich dem
Betrieb der Anwendung sowie der Fehleranalyse.

Bei einem Serverfehler kann in einem Fehlerprotokoll eine vollständige IP-Adresse enthalten sein.
Auch diese Protokolle werden spätestens nach **14 Tagen gelöscht**.

## Rechtsgrundlage und Einwilligung

Rechtsgrundlage für die Speicherung und weitere Verarbeitung des Fotos ist die **Einwilligung nach
Art. 6 Abs. 1 lit. a DSGVO**.

Die Einwilligung wird durch die Bedienung des Fotoautomaten erteilt: Durch das Auslösen wird ein
Foto aufgenommen; durch die Freigabe mit der grünen Taste wird das Foto dauerhaft gespeichert und
zum Ausdruck freigegeben.

Die Einwilligung kann jederzeit widerrufen werden. Für den Widerruf steht insbesondere der unten
beschriebene Löschvorgang zur Verfügung.

Die Rechtmäßigkeit der Verarbeitung bis zum Widerruf bleibt vom Widerruf unberührt.

## Zugriffsberechtigungen und Empfänger

### Webseite

Auf der Webseite kann ein Foto von jeder Person aufgerufen werden, die die zugehörige Foto-ID kennt.
Es gibt keine Übersicht aller Fotos und keine Suchfunktion. Die Seiten sind für Suchmaschinen mit
`noindex` gekennzeichnet.

Die Kenntnis der Foto-ID ist daher erforderlich, aber keine zusätzliche Authentifizierung.

### Server im Ausstellungsnetz

Die an den Ausstellungstischen eingesetzten historischen Rechner können Fotos über einen lokalen
Ausstellungsnetz abrufen und auf ihren eigenen Bildschirmen anzeigen. Dies ist Teil des Zwecks des
Laufzettels.

Innerhalb des Ausstellungsnetzes kann ein Foto während der Ausstellung daher technisch auch für
andere Personen abrufbar sein, die über entsprechende Kenntnisse oder technische Möglichkeiten
verfügen.

### Ausgestellte Rechner

Besucher können Ihr Foto an ausgestellten Rechner darstellen oder ausdrucken lassen. Dazu wird das
Foto vom lokalen Server abgerufen und so lange gespeichert, wie das für die Anzeige und den Ausdruck
notwendig ist. Dann wird es gelöscht.

### Keine sonstige Weitergabe

Die Daten werden nicht verkauft und nicht zu Werbezwecken weitergegeben. Eine Übermittlung in
Drittländer findet nicht statt.

Wer nicht möchte, dass ein Foto im Ausstellungsnetz verfügbar ist, sollte es nicht zum Ausdruck
freigeben. Verworfene Aufnahmen verlassen den Fotoautomaten nicht und werden nicht dauerhaft
gespeichert.

## Speicherdauer

Das Foto, alle daraus erzeugten Formate und der zugehörige Datenbankeintrag werden **drei Monate
nach Ende der Ausstellung** automatisch gelöscht.

Die Kopien im Ausstellungsnetz bestehen nur während der Ausstellung.

Beim Besuch eines Ausstellungsstands kann die jeweilige Bild-ID mitgeteilt oder eingegeben werden.
Auf dieser Grundlage kann das zugehörige Bild auf den dort ausgestellten Rechner heruntergeladen und
angezeigt oder ausgedruckt werden. Nach der Anzeige beziehungsweise dem Ausdruck wird das Bild vom
jeweiligen Aussteller gelöscht.

## Löschung

Auf dem Beleg stehen die Foto-ID und ein **Löschcode**. Mit diesem Löschcode kann das Foto auf der
Webseite jederzeit selbst gelöscht werden.

Der Löschcode wird ausschließlich auf dem Beleg ausgegeben und nicht auf dem Server gespeichert.
Daraus ergeben sich zwei wesentliche Eigenschaften:

- Ohne den Löschcode kann auch eine Person mit Zugriff auf den Server kein fremdes Foto über die
  Löschfunktion löschen.
- Wer den Beleg verliert, kann die Löschung nicht mehr selbst über die Webseite auslösen. In diesem
  Fall genügt eine Nachricht an [info@classic-computing.de](mailto:info@classic-computing.de). Die
  Foto-ID ist dafür ausreichend; sie steht ebenfalls auf dem Beleg und auf der Webseite zum Foto.

Beim Löschvorgang werden das Foto, sämtliche daraus erzeugten Formate und der zugehörige
Beleg-Datensatz gelöscht.

Auf der Webseite wird die Löschung unmittelbar wirksam. Die Kopien auf dem Server im
Ausstellungsnetz werden innerhalb von etwa einer Minute nachgezogen, sobald der Fotoautomat wieder
erreichbar ist. Bei einer Unterbrechung des Ausstellungsnetzes kann die Löschung entsprechend später
erfolgen.

Nach einer Löschung bleibt lediglich ein technischer Eintrag aus Foto-ID, Hash und zwei Zeitstempeln
bestehen. Er dient dazu, dauerhaft kenntlich zu machen, dass für diese Foto-ID eine Löschung
verlangt wurde. Dieser Eintrag enthält kein Bild.

Der ausgedruckte Beleg verbleibt bei der Person, die ihn erhalten hat, und kann von uns nicht
zurückgeholt werden.

## Rechte betroffener Personen

Betroffene Personen haben nach Maßgabe der gesetzlichen Voraussetzungen insbesondere folgende
Rechte:

- **Auskunft** nach Art. 15 DSGVO
- **Berichtigung** nach Art. 16 DSGVO
- **Löschung** nach Art. 17 DSGVO
- **Einschränkung der Verarbeitung** nach Art. 18 DSGVO
- **Datenübertragbarkeit** nach Art. 20 DSGVO
- **Widerspruch** nach Art. 21 DSGVO, soweit die gesetzlichen Voraussetzungen dafür vorliegen
- **Widerruf einer erteilten Einwilligung** mit Wirkung für die Zukunft

Für Auskunft und Datenübertragbarkeit kann in der Regel die Foto-ID verwendet werden. Unter dieser
ID werden das Foto und die daraus erzeugten Formate gespeichert; diese können auf Anfrage als
ZIP-Datei bereitgestellt werden.

## Beschwerderecht bei einer Datenschutzaufsichtsbehörde

Betroffene Personen haben das Recht, sich bei einer Datenschutzaufsichtsbehörde über die
Verarbeitung ihrer personenbezogenen Daten durch uns zu beschweren.

Zuständig ist grundsätzlich die Datenschutzaufsichtsbehörde, die sich aus den gesetzlichen
Zuständigkeitsregelungen ergibt. Eine Übersicht der Datenschutzaufsichtsbehörden und deren
Kontaktdaten stellt die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit bereit.

## Aufnahmen weiterer Personen

Der Fotoautomat fotografiert, was sich im Aufnahmebereich vor der Kamera befindet. Wer gemeinsam mit
anderen Personen ein Foto aufnimmt, sollte sicherstellen, dass diese mit der Aufnahme und der
vorgesehenen Verarbeitung einverstanden sind.

Wer unbeabsichtigt auf einem fremden Foto erscheint und mit der Verarbeitung nicht einverstanden
ist, kann sich an [info@classic-computing.de](mailto:info@classic-computing.de) wenden. Das
betreffende Foto wird dann gelöscht.
