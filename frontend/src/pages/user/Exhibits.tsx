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
      getCurrentExhibition {
        id
        frozen
      }
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
  const frozen = data.getCurrentExhibition?.frozen ?? false

  return (
    <article className="space-y-6">
      <header>
        <PageHeading>Deine Exponate</PageHeading>
        {frozen ? (
          <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
            Diese Ausstellung ist abgeschlossen. Deine Exponate können nur noch angesehen werden.
          </p>
        ) : (
          <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
            Hier findest Du eine Übersicht aller Deiner Exponate. Du kannst sie bearbeiten oder neue
            Exponate erstellen.
          </p>
        )}
      </header>

      <ChipContainer>
        {exhibits?.map((exhibit, index: number) => (
          <ExhibitChip key={index} exhibit={exhibit} noExhibitor url="/exhibit" />
        ))}
      </ChipContainer>

      {!frozen && (
        <ActionBar>
          <Link to="/user/import-exhibits">
            <Button>Exponate aus früheren Jahren importieren</Button>
          </Link>
          <Link to="/user/exhibit/new">
            <Button>Neues Exponat</Button>
          </Link>
        </ActionBar>
      )}
    </article>
  )
}

export default UserExhibits
