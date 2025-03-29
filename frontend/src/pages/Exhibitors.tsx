import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitorChip from '@components/ExhibitorChip.tsx'

const GET_EXHIBITORS = graphql(
  `
    query GetExhibitors {
      getCurrentExhibition {
        id
        exhibitors {
          ...ExhibitorChip
        }
      }
    }
  `,
  [ExhibitorChip.fragment],
)

const Exhibitors = () => {
  const { data } = useQuery(GET_EXHIBITORS)
  if (data?.getCurrentExhibition) {
    const exhibitors = [...data!.getCurrentExhibition!.exhibitors!].sort(
      ({ user: a }, { user: b }) =>
        (a.nickname || a.fullName || '').localeCompare(b.nickname || b.fullName || ''),
    )
    return (
      <ChipContainer>
        {exhibitors.map((exhibitor) => (
          <ExhibitorChip key={exhibitor.id} exhibitor={exhibitor} />
        ))}
      </ChipContainer>
    )
  }
}

export default Exhibitors
