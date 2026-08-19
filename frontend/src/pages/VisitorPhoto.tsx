import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeading from '@components/PageHeading.tsx'
import Card from '@components/Card.tsx'
import Button from '@components/Button.tsx'

/*
 * Die Seite, auf die der QR-Code des Laufzettels führt.
 *
 * Ein Besucher kommt mit dem Telefon hierher und findet sein Foto, die Formate
 * für die alten Rechner und die Tische, an denen es gezeigt werden kann. Der
 * gleiche Weg dient dem Aussteller, der am Tisch eine Foto-ID eintippt.
 *
 * Wer einen Browser mitbringt, der diese Seite nicht bauen kann, bekommt vom
 * Server dieselbe Seite als schlichtes HTML — deshalb steht der Inhalt hier
 * genauso wie dort.
 */

type DescribedFile = { name: string; text: string }
type Group = { title: string; files: DescribedFile[] }

type PhotoPage =
  | { id: string; deleted: true }
  | { id: string; deleted: false; converting: boolean; groups: Group[]; tables: number[] }

/* Solange die Umwandlung läuft, kommen die Formate nach und nach dazu. */
const RELOAD_WHILE_CONVERTING_MS = 15000

const VisitorPhoto = () => {
  const { id = '' } = useParams()
  const [page, setPage] = useState<PhotoPage | null>(null)
  const [missing, setMissing] = useState(false)
  const [code, setCode] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch(`/api/visitor-photo/${encodeURIComponent(id)}/page`)
    if (!response.ok) {
      setPage(null)
      setMissing(true)
      return
    }
    setMissing(false)
    setPage(await response.json())
  }, [id])

  /*
   * Eine andere ID fängt von vorn an. React Router lässt diese Seite stehen und
   * tauscht nur den Parameter aus, also muss hier fallen, was zur vorigen ID
   * gehörte — sonst bliebe die Auskunft „gibt es nicht" über dem nächsten Foto
   * stehen. Der Zähler bricht ab, was noch unterwegs ist, damit eine langsame
   * Antwort keine neuere überschreibt.
   */
  useEffect(() => {
    let current = true
    setPage(null)
    setMissing(false)
    setProblem(null)
    setCode('')
    void (async () => {
      const response = await fetch(`/api/visitor-photo/${encodeURIComponent(id)}/page`)
      if (!current) return
      if (!response.ok) {
        setMissing(true)
        return
      }
      setPage(await response.json())
    })()
    return () => {
      current = false
    }
  }, [id])

  useEffect(() => {
    if (!page || page.deleted || !page.converting) return
    const timer = setTimeout(() => void load(), RELOAD_WHILE_CONVERTING_MS)
    return () => clearTimeout(timer)
  }, [page, load])

  const remove = async (event: React.FormEvent) => {
    event.preventDefault()
    setProblem(null)
    setDeleting(true)
    try {
      const response = await fetch(`/api/visitor-photo/${encodeURIComponent(id)}/loeschen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const answer = await response.json()
      if (!response.ok) {
        setProblem(answer.error ?? 'Das hat nicht geklappt.')
        return
      }
      setPage({ id, deleted: true })
    } finally {
      setDeleting(false)
    }
  }

  if (missing) {
    return (
      <article>
        <PageHeading>Dieses Foto gibt es nicht</PageHeading>
        <p className="text-gray-700 dark:text-gray-300">
          Die Foto-ID <span className="font-mono">{id}</span> führt zu keinem Bild. Auf dem
          Laufzettel stehen sechs Zeichen; vielleicht hat sich eines verlesen.
        </p>
      </article>
    )
  }

  if (!page) {
    return (
      <article>
        <PageHeading>Dein Foto</PageHeading>
        <p className="text-gray-500 dark:text-gray-400">Wird geladen …</p>
      </article>
    )
  }

  if (page.deleted) {
    return (
      <article>
        <PageHeading>Das Foto ist gelöscht</PageHeading>
        <p className="text-gray-700 dark:text-gray-300">
          Das Bild, alle umgewandelten Formate und der Laufzettel sind entfernt. Auf den Rechnern
          der Ausstellung verschwindet es innerhalb einer Minute.
        </p>
      </article>
    )
  }

  return (
    <article className="space-y-6">
      <div>
        <PageHeading>Dein Foto</PageHeading>
        <p className="font-mono text-xl tracking-widest text-gray-600 dark:text-gray-400">
          {page.id}
        </p>
      </div>

      <img
        src={`/foto/${page.id}/photo.jpg`}
        alt="Das aufgenommene Foto"
        className="w-full max-w-2xl rounded-lg shadow-md"
      />

      {page.converting && (
        <Card className="border-l-4 border-blue-500">
          <p className="text-gray-700 dark:text-gray-300">
            Dein Foto wird gerade in die Formate der alten Rechner umgewandelt. Das dauert meist
            weniger als zwei Minuten; diese Seite holt sie von selbst nach.
          </p>
        </Card>
      )}

      <a
        className="inline-block rounded bg-blue-600/80 px-4 py-2 text-white hover:bg-blue-600"
        href={`/foto/${page.id}/alle-formate.zip`}>
        Alle Formate als ZIP laden
      </a>

      {page.groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Dein Foto wurde in Formate umgewandelt, die alte Rechner anzeigen können. Lade dir
            herunter, was zu deinem Rechner passt.
          </p>
          {page.groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">{group.title}</h2>
              {/* Eine Zeile je Datei: der Name zum Klicken, daneben, was drin
                  ist — an c64-koala.koa sieht man das nicht. */}
              <ul className="space-y-1">
                {group.files.map((file) => (
                  <li key={file.name} className="sm:flex sm:items-baseline sm:gap-2">
                    <a
                      className="font-mono text-sm text-blue-700 underline hover:no-underline dark:text-blue-400"
                      href={`/foto/${page.id}/${encodeURIComponent(file.name)}`}>
                      {file.name}
                    </a>
                    {file.text && (
                      <span className="ml-4 block text-sm text-gray-600 sm:ml-0 sm:inline dark:text-gray-400">
                        {file.text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {page.tables.length > 0 && (
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Dein Laufzettel
          </h2>
          <p className="mb-2 text-gray-700 dark:text-gray-300">
            An diesen Tischen kann dein Foto gezeigt werden:
          </p>
          <ul className="flex flex-wrap gap-2">
            {page.tables.map((table) => (
              <li key={table}>
                <Link
                  className="inline-block rounded border border-gray-300 px-3 py-1 text-blue-700 hover:bg-gray-100 dark:border-gray-600 dark:text-blue-400 dark:hover:bg-gray-700"
                  to={`/table/${table}`}>
                  {table}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Foto löschen
        </h2>
        <p className="mb-3 text-gray-700 dark:text-gray-300">
          Du kannst dein Foto jederzeit löschen lassen. Dabei werden das Bild, alle umgewandelten
          Formate und der Laufzettel entfernt — auf dieser Webseite sofort, auf den Rechnern der
          Ausstellung innerhalb einer Minute.
        </p>
        {problem && <p className="mb-3 text-red-600 dark:text-red-400">{problem}</p>}
        <form className="flex flex-wrap items-center gap-2" onSubmit={remove}>
          <label className="text-gray-700 dark:text-gray-300">
            Löschcode vom Laufzettel:{' '}
            <input
              className="rounded border border-gray-300 px-2 py-1 font-mono uppercase dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
              size={12}
            />
          </label>
          <Button type="submit" variant="danger" disabled={deleting}>
            Endgültig löschen
          </Button>
        </form>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Das Löschen lässt sich nicht rückgängig machen.
        </p>
      </Card>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        <a className="underline" href="/foto/datenschutz">
          Datenschutz
        </a>{' '}
        · Fotos werden drei Monate nach der Ausstellung gelöscht.
      </p>
    </article>
  )
}

export default VisitorPhoto
