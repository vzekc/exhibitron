import { useLocation, useParams } from 'react-router-dom'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import ExhibitorCard from '@components/ExhibitorCard.tsx'
import { graphql } from 'gql.tada'
import { useMutation, useQuery } from '@apollo/client'
import { useEffect } from 'react'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ChipContainer from '@components/ChipContainer.tsx'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import { getDisplayName } from '@utils/displayName'

const GET_EXHIBITOR = graphql(
  `
    query GetExhibitor($id: Int!) {
      getExhibitor(id: $id) {
        tables {
          number
        }
        ...ExhibitorDetails
        exhibits {
          ...ExhibitCard
        }
      }
    }
  `,
  [ExhibitChip.fragment, ExhibitorCard.fragment],
)

const SWITCH_EXHIBITOR = graphql(`
  mutation SwitchExhibitor($exhibitorId: Int!) {
    switchExhibitor(exhibitorId: $exhibitorId) {
      id
    }
  }
`)

const Exhibitor = () => {
  const { id } = useParams<{ id: string }>()
  const { data } = useQuery(GET_EXHIBITOR, {
    variables: { id: +id! },
  })
  const { setDetailName } = useBreadcrumb()
  const location = useLocation()
  useEffect(() => {
    if (data?.getExhibitor?.user) {
      setDetailName(location.pathname, getDisplayName(data.getExhibitor.user))
    }
  }, [location.pathname, data, setDetailName])
  const { exhibitor: operator, reloadExhibitor } = useExhibitor()
  const [switchExhibitor] = useMutation(SWITCH_EXHIBITOR)

  if (!data || !id || !data?.getExhibitor) return null

  const exhibitor = data.getExhibitor
  const { exhibits, user } = exhibitor

  const handleSwitchExhibitor = async () => {
    await switchExhibitor({ variables: { exhibitorId: exhibitor.id } })
    await reloadExhibitor()
  }

  return (
    <>
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
      {operator?.canSwitchExhibitor && exhibitor?.id !== operator?.id && (
        <ActionBar>
          <Button onClick={handleSwitchExhibitor} variant="secondary" icon="become">
            Become {getDisplayName(user)}
          </Button>
        </ActionBar>
      )}
    </>
  )
}

export default Exhibitor
