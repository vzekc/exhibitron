/*
 * The pages a visitor sees. Server-rendered German, no session, no script, and
 * nothing that identifies them beyond the photo they chose to take.
 */

const STYLE = `
  :root { color-scheme: light dark }
  body { font-family: system-ui, sans-serif; line-height: 1.5; margin: 0 auto;
         max-width: 44rem; padding: 1.5rem }
  h1 { font-size: 1.6rem; margin-bottom: .2rem }
  .id { font-family: ui-monospace, monospace; font-size: 1.3rem; letter-spacing: .15em }
  img.foto { width: 100%; height: auto; border-radius: .4rem; margin: 1rem 0 }
  h2 { font-size: 1.05rem; margin: 1.4rem 0 .3rem }
  ul.files { list-style: none; padding: 0; margin: 0;
             display: flex; flex-wrap: wrap; gap: .4rem }
  ul.files a { display: inline-block; padding: .25rem .6rem; border: 1px solid;
               border-radius: .3rem; text-decoration: none; font-size: .9rem }
  .zip { display: inline-block; margin: .8rem 0; padding: .5rem 1rem;
         border: 2px solid; border-radius: .4rem; font-weight: 600; text-decoration: none }
  .tables { display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; list-style: none }
  .tables li { padding: .2rem .7rem; border: 1px solid; border-radius: .3rem }
  form.delete { margin-top: 2.5rem; padding-top: 1.2rem; border-top: 1px solid }
  input[name=code] { font-family: ui-monospace, monospace; font-size: 1.1rem;
                     letter-spacing: .12em; padding: .4rem; text-transform: uppercase }
  .warn { color: #b3261e; font-weight: 600 }
  footer { margin-top: 3rem; font-size: .85rem; opacity: .75 }
`

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${escape(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
<footer>
  <a href="/datenschutz">Datenschutz</a> ·
  Fotos werden drei Monate nach der Ausstellung gelöscht.
</footer>
</body>
</html>`
}

export function renderPhotoPage(
  id: string,
  groups: { title: string; files: string[] }[],
  tables: number[],
  problem?: string,
) {
  const downloads = groups
    .map(
      (g) => `<h2>${escape(g.title)}</h2>
  <ul class="files">${g.files
    .map((f) => `<li><a href="/foto/${id}/datei/${encodeURIComponent(f)}">${escape(f)}</a></li>`)
    .join('')}</ul>`,
    )
    .join('\n')

  const trail =
    tables.length > 0
      ? `<h2>Dein Laufzettel</h2>
  <p>An diesen Tischen kann dein Foto gezeigt werden:</p>
  <ul class="tables">${tables.map((n) => `<li>Tisch ${n}</li>`).join('')}</ul>`
      : ''

  return page(
    `Dein Foto ${id}`,
    `<h1>Dein Foto</h1>
<p class="id">${escape(id)}</p>

<img class="foto" src="/foto/${id}/datei/photo.jpg" alt="Das aufgenommene Foto">

<a class="zip" href="/foto/${id}/alle-formate.zip">Alle Formate als ZIP laden</a>

<p>Dein Foto wurde in Formate umgewandelt, die alte Rechner anzeigen können.
Lade dir herunter, was zu deinem Rechner passt.</p>

${downloads}

${trail}

<form class="delete" method="post" action="/foto/${id}/loeschen">
  <h2>Foto löschen</h2>
  <p>Du kannst dein Foto jederzeit löschen lassen. Dabei werden das Bild, alle
  umgewandelten Formate und der Beleg entfernt — auf dieser Webseite sofort, auf
  den Rechnern der Ausstellung innerhalb einer Minute.</p>
  ${problem ? `<p class="warn">${escape(problem)}</p>` : ''}
  <p>
    <label>Löschcode vom Beleg:
      <input name="code" required autocomplete="off" spellcheck="false" size="12">
    </label>
    <button type="submit">Endgültig löschen</button>
  </p>
  <p><small>Das Löschen lässt sich nicht rückgängig machen.</small></p>
</form>`,
  )
}

/* What anybody who follows the link afterwards sees, including the visitor. */
export function renderDeletedPage() {
  return page(
    'Daten gelöscht',
    `<h1>Daten gelöscht</h1>
<p>Diese Besucherin oder dieser Besucher hat die Löschung der eigenen Daten
verlangt. Das Foto und alle daraus erzeugten Dateien wurden entfernt.</p>`,
  )
}

export function renderDeletedConfirmation() {
  return page(
    'Dein Foto wurde gelöscht',
    `<h1>Dein Foto wurde gelöscht</h1>
<p>Das Bild, alle umgewandelten Formate und der Beleg sind von dieser Webseite
entfernt. Die Kopien auf den Rechnern der Ausstellung werden innerhalb einer
Minute nachgezogen, sobald der Fotoautomat wieder im Netz ist.</p>
<p>Der ausgedruckte Beleg in deiner Hand bleibt natürlich bei dir — den können
wir nicht zurückholen.</p>`,
  )
}

export function renderNotFound() {
  return page(
    'Unbekannter Code',
    `<h1>Unbekannter Code</h1>
<p>Zu diesem Code gibt es kein Foto. Bitte prüfe die Zeichen auf deinem Beleg.
Die Zeichen 0, O, 1 und I kommen in den Codes nicht vor — was wie eine Null
aussieht, ist keine.</p>`,
  )
}
