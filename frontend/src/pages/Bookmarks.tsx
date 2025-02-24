import { getBookmarks } from '../utils/bookmarks.ts'
import ExhibitList from '../components/ExhibitList.tsx'

const Bookmarks = () => {
  const bookmarks = getBookmarks().map(({ exhibitor, ...e }) => ({
    ...e,
    exhibitorId: exhibitor.id!,
    exhibitorName: exhibitor.fullName!,
  }))

  return (
    <article>
      <h2>Meine Lesezeichen</h2>
      {bookmarks.length ? (
        <ExhibitList
          notFoundLabel="Keine Lesezeichen gefunden"
          exhibits={bookmarks}
        />
      ) : (
        <p>
          Hier findest Du eine Liste der Ausstellungen, die Du mit einem
          Lesezeichen versehen hast.
        </p>
      )}
    </article>
  )
}

export default Bookmarks
