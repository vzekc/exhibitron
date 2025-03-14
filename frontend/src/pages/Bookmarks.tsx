import { getBookmarks } from '../utils/bookmarks.ts'
import ExhibitList from '../components/ExhibitList.tsx'

const Bookmarks = () => {
  // fixme bookmark types?!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookmarks = (getBookmarks().exhibits as any).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ exhibitor, ...e }: { exhibitor: any }) => ({
      ...e,
      exhibitorId: exhibitor.id!,
      exhibitorName: exhibitor.fullName!,
    }),
  )

  return (
    <article>
      <h2>Meine Lesezeichen</h2>
      {bookmarks.length ? (
        <ExhibitList notFoundLabel="Keine Lesezeichen gefunden" exhibits={bookmarks} />
      ) : (
        <p>Hier findest Du die Exponate, die Du mit einem Lesezeichen versehen hast.</p>
      )}
    </article>
  )
}

export default Bookmarks
