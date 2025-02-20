import { getBookmarks } from '../utils/bookmarks'
import ExhibitTable from './ExhibitTable'

const Bookmarks = () => {
  const exhibits = getBookmarks()

  return (
    <article>
      <h2>Meine Lesezeichen</h2>
      <ExhibitTable
        exhibits={exhibits.map(({ exhibitor, ...e }) => ({
          ...e,
          exhibitorId: exhibitor.id!,
          exhibitorName: exhibitor.username!,
        }))}
      />
    </article>
  )
}

export default Bookmarks
