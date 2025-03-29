import { getBookmarks } from '@utils/bookmarks.ts'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitChip from '@components/ExhibitChip.tsx'
import { FragmentOf } from 'gql.tada'

type ExhibitCardItem = FragmentOf<typeof ExhibitChip.fragment>

const Bookmarks = () => {
  const bookmarks = getBookmarks().exhibits as ExhibitCardItem[]

  return (
    <article>
      {bookmarks.length ? (
        <ChipContainer>
          {bookmarks.map((exhibit, index: number) => (
            <ExhibitChip key={index} exhibit={exhibit} />
          ))}
        </ChipContainer>
      ) : (
        <p>Hier findest Du die Exponate, die Du mit einem Lesezeichen versehen hast.</p>
      )}
    </article>
  )
}

export default Bookmarks
