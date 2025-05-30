import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitorChip from '@components/ExhibitorChip.tsx'
import { useEffect, useState } from 'react'
import { getDisplayName } from '@utils/displayName'

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
  type Exhibitor = NonNullable<
    NonNullable<NonNullable<typeof data>['getCurrentExhibition']>['exhibitors']
  >[number]
  type Exhibitors = Exhibitor[]
  const [exhibitors, setExhibitors] = useState<Exhibitors | null>([])

  useEffect(() => {
    if (data?.getCurrentExhibition?.exhibitors) {
      setExhibitors(
        [...data.getCurrentExhibition.exhibitors].sort((a, b) => {
          return getDisplayName(a.user)
            .toLowerCase()
            .localeCompare(getDisplayName(b.user).toLowerCase())
        }),
      )
    }
  }, [data?.getCurrentExhibition?.exhibitors])

  if (data?.getCurrentExhibition) {
    return (
      <article>
        <ChipContainer>
          {exhibitors?.map((exhibitor) => (
            <ExhibitorChip key={exhibitor.id} exhibitor={exhibitor} />
          ))}
        </ChipContainer>
      </article>
    )
  }
}

export default Exhibitors
