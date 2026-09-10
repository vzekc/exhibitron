import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import Papa from 'papaparse'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitChip from '@components/ExhibitChip.tsx'
import LoadInProgress from '@components/LoadInProgress'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import { downloadCSV } from '@pages/admin/utils'

const GET_EXHIBITION = graphql(
  `
    query GetExhibits {
      getCurrentExhibition {
        id
        key
      }
      getExhibits {
        ...ExhibitCard
        touchMe
        attributes {
          name
          value
        }
        exhibitor {
          id
          topic
        }
      }
    }
  `,
  [ExhibitChip.fragment],
)

const Exhibits = () => {
  const { data } = useQuery(GET_EXHIBITION)
  const { exhibitor } = useExhibitor()

  if (!data?.getExhibits) {
    return <LoadInProgress />
  }

  /* One row per exhibit, the columns of the card plus what an admin planning
     the hall wants to sort by. The description is HTML and stays out. */
  const exportCsv = () => {
    const rows = [...data.getExhibits!]
      .sort(
        (a, b) =>
          (a.table?.number ?? Infinity) - (b.table?.number ?? Infinity) ||
          a.title.localeCompare(b.title, 'de'),
      )
      .map((exhibit) => ({
        Tisch: exhibit.table?.number ?? '',
        Titel: exhibit.title,
        Aussteller: exhibit.exhibitor.user.fullName ?? '',
        Nickname: exhibit.exhibitor.user.nickname ?? '',
        Thema: exhibit.exhibitor.topic ?? '',
        Anfassen: exhibit.touchMe ? 'Ja' : 'Nein',
        Attribute: (exhibit.attributes ?? [])
          .map((attribute) => `${attribute.name}: ${attribute.value}`)
          .join(' | '),
      }))
    downloadCSV(
      Papa.unparse(rows, { delimiter: ';' }),
      `exponate-${data.getCurrentExhibition?.key ?? 'cc'}.csv`,
    )
  }

  return (
    <article>
      {exhibitor?.user.isAdministrator && (
        <ActionBar>
          <Button onClick={exportCsv}>Als CSV exportieren</Button>
        </ActionBar>
      )}
      <ChipContainer>
        {data.getExhibits.map((exhibit, index: number) => (
          <ExhibitChip key={index} exhibit={exhibit} />
        ))}
      </ChipContainer>
    </article>
  )
}

export default Exhibits
