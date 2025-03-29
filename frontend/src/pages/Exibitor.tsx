import { useLocation, useParams } from 'react-router-dom'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import ExhibitorCard from '@components/ExhibitorCard.tsx'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { useEffect } from 'react'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ChipContainer from '@components/ChipContainer.tsx'

const GET_EXHIBITOR = graphql(
  `
    query GetExhibitor($id: Int!) {
      getExhibitor(id: $id) {
        ...ExhibitorDetails
        exhibits {
          ...ExhibitCard
        }
      }
    }
  `,
  [ExhibitChip.fragment, ExhibitorCard.fragment],
)

const Exhibitor = () => {
  const { id } = useParams<{ id: string }>()
  const { data } = useQuery(GET_EXHIBITOR, {
    variables: { id: +id! },
  })
  const { setDetailName } = useBreadcrumb()
  const location = useLocation()
  useEffect(() => {
    const name = data?.getExhibitor?.user?.fullName
    if (name) {
      setDetailName(location.pathname, name)
    }
  }, [location.pathname, data, setDetailName])

  if (!data || !id || !data?.getExhibitor) return null

  const exhibitor = data.getExhibitor
  const exhibits = exhibitor.exhibits

  return (
    <article className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <ExhibitorCard exhibitor={exhibitor} />
      {exhibits && exhibits.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Exponate</h2>
          <ChipContainer>
            {exhibits?.map((exhibit, index: number) => (
              <ExhibitChip key={index} exhibit={exhibit} />
            ))}
          </ChipContainer>
        </div>
      )}
    </article>
  )
}

export default Exhibitor
