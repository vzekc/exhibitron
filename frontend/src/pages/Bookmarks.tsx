import { getBookmarks } from '@utils/bookmarks.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitChip from '@components/ExhibitChip.tsx'
import LoadInProgress from '@components/LoadInProgress'

const GET_CURRENT_EXHIBITION = graphql(
  `
    query GetCurrentExhibition {
      getCurrentExhibition {
        id
        exhibits {
          ...ExhibitCard
        }
      }
    }
  `,
  [ExhibitChip.fragment],
)

const Bookmarks = () => {
  const { data } = useQuery(GET_CURRENT_EXHIBITION)
  const bookmarks = getBookmarks()

  if (!data?.getCurrentExhibition?.exhibits) {
    return <LoadInProgress />
  }

  const exhibits = data.getCurrentExhibition.exhibits.filter((exhibit) =>
    bookmarks.exhibits.some((bookmark) => bookmark.id === exhibit.id),
  )

  return (
    <article>
      {exhibits.length ? (
        <ChipContainer>
          {exhibits.map((exhibit, index: number) => (
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
