import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitChip from '@components/ExhibitChip.tsx'
import LoadInProgress from '@components/LoadInProgress'

const GET_EXHIBITION = graphql(
  `
    query GetExhibits {
      getExhibits {
        ...ExhibitCard
      }
    }
  `,
  [ExhibitChip.fragment],
)

const Exhibits = () => {
  const { data } = useQuery(GET_EXHIBITION)

  if (!data?.getExhibits) {
    return <LoadInProgress />
  }
  return (
    <article>
      <ChipContainer>
        {data?.getExhibits?.map((exhibit, index: number) => (
          <ExhibitChip key={index} exhibit={exhibit} />
        ))}
      </ChipContainer>
    </article>
  )
}

export default Exhibits
