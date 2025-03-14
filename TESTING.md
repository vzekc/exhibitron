# Testplan für exhibitron

## Allgemeine Fragen

- [ ] Funktioniert die Anwendung auf allen gängigen Browsern?
- [ ] Funktioniert die Anwendung auf mobilen Geräten?
- [ ] Funktioniert die Anwendung auf Tablets?
- [ ] Funktioniert die Anwendung auf Desktop-PCs?
- [ ] Funktioniert die Anwendung auf allen gängigen Betriebssystemen?
- [ ] Funktioniert die Anwendung auf allen gängigen Bildschirmauflösungen?
- [ ] Sind alle Texte verständlich?
- [ ] Sind alle Texte korrekt?
- [ ] Findet man sich leicht zurecht?
- [ ] Sind alle Funktionen intuitiv bedienbar?
- [ ] Sind alle Funktionen selbsterklärend?
- [ ] Sind alle Texte in deutscher Sprache?

# Übergreifende Funktionen

## Login / Rechtevergabe

- [ ] Login mit korrekten Daten
- [ ] Login mit falschem Passwort
- [ ] Login mit falschem Benutzernamen
- [ ] Login mit falschem Benutzernamen und Passwort
- [ ] Login über Forum
- [ ] Administratorrechte werden bei Forum-Login übernommen
- [ ] "Normale" Forumsbenutzer haben keine Administratorrechte
- [ ] Forumsbenutzer ohne Registrierung können keine Ausstellungen erstellen

## Kennwort zurücksetzen

- [ ] Kennwort zurücksetzen mit korrekter E-Mail
- [ ] Kennwort zurücksetzen mit falscher E-Mail
- [ ] Kennwort zurücksetzen mit nicht registrierter E-Mail
- [ ] Rücksetzlink in Email funktioniert
- [ ] Rücksetzlink in Email funktioniert nicht nach 24 Stunden
- [ ] Anmeldung mit neuem Kennwort funktioniert

# Aussteller-Funktionen

## Registrierung

- [ ] Registrierung mit korrekten Daten
- [ ] Registrierung mit bereits registrierter E-Mail
- [ ] Registrierung mit leerem Benutzernamen
- [ ] Registrierung mit leerer E-Mail
- [ ] Link in der Bestätigungsmail funktioniert
- [ ] Eingegebenes Ausstellungsthema als Ausstellung angelegt
- [ ] Profil enthält Nicknamen oder Vor- und Nachnamen

## Tische

- [ ] Tisch kann beansprucht werden
- [ ] Tisch kann freigegeben werden
- [ ] Beanspruchter Tisch kann nicht erneut beansprucht werden

## Ausstellung bearbeiten

- [ ] Existierende Ausstellung kann bearbeitet werden (Titel, Beschreibung, Tisch)
- [ ] Ausstellung kann gelöscht werden
- [ ] Suche nach Tisch findet Ausstellung
- [ ] Texteditor unterstützt Überschriften, Fettdruck, Links
- [ ] Texteditor unterstützt Bilder per Drag & Drop
- [ ] Texteditor unterstützt Bilder per Dateiauswahl
- [ ] Texteditor unterstützt Bilder per Copy & Paste
- [ ] HTML wird korrekt gefiltert (erfordert direkten GraphQL-Zugriff)

# Administrator-Funktionen

## Seiten bearbeiten

- [ ] Seiten können bearbeitet werden
- [ ] Änderungen werden sofort sichtbar

# Besucher-Funktionen

## Tischsuche

- [ ] Tischsuche funktioniert
- [ ] Aussteller kann freien Tisch beanspruchen
- [ ] Aussteller kann Tisch freigeben

## Lesezeichen

- [ ] Ausstellung kann gebookmarked werden
- [ ] Ausstellung kann aus Lesezeichen entfernt werden
- [ ] Gelösche Ausstellung wird aus Lesezeichen entfernt
- [ ] Ausstellung kann aus Lesezeichen aufgerufen werden
- [ ] Ausstellung kann aus Lesezeichen aufgerufen werden, wenn nicht eingeloggt
- [ ] Lesezeichensymbol in der Titelleiste ändert sich, wenn Lesezeichen gesetzt
