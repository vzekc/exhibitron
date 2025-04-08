import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ChipContainer from '@components/ChipContainer.tsx'
import PageHeading from '@components/PageHeading.tsx'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import LoadInProgress from '@components/LoadInProgress'

const GET_MY_EXHIBITS = graphql(
  `
    query GetMyExhibits {
      getCurrentExhibitor {
        id
        exhibits {
          ...ExhibitCard
        }
      }
    }
  `,
  [ExhibitChip.fragment],
)

const UserExhibits = () => {
  const { data } = useQuery(GET_MY_EXHIBITS)

  if (!data?.getCurrentExhibitor?.exhibits) {
    return <LoadInProgress />
  }
  const { exhibits } = data.getCurrentExhibitor

  return (
    <article className="space-y-6">
      <header>
        <PageHeading>Deine Exponate</PageHeading>
        <p className="mt-2 text-base text-gray-700">
          Hier findest Du eine Übersicht aller Deiner Exponate. Du kannst sie bearbeiten oder neue
          Exponate erstellen.
        </p>
      </header>

      <ChipContainer>
        {exhibits?.map((exhibit, index: number) => (
          <ExhibitChip key={index} exhibit={exhibit} noExhibitor url="/exhibit" />
        ))}
      </ChipContainer>

      <ActionBar>
        <Link to="/user/exhibit/new">
          <Button>Neues Exponat</Button>
        </Link>
      </ActionBar>
    </article>
  )
}

export default UserExhibits
