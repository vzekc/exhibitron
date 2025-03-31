import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ExhibitorChip from './ExhibitorChip.tsx'
import TableChip from './TableChip.tsx'
import ServerHtmlContent from './ServerHtmlContent'
import PageHeading from './PageHeading'
import { KeyValueTable, TableRow, TableCell } from './Table'
import Article from './Article'
import Card from '@components/Card.tsx'

const GET_EXHIBIT = graphql(
  `
    query GetExhibit($id: Int!) {
      getExhibit(id: $id) {
        id
        title
        description
        descriptionExtension
        table {
          number
        }
        attributes {
          name
          value
        }
        mainImage
        exhibitor {
          ...ExhibitorChip
        }
      }
    }
  `,
  [ExhibitorChip.fragment],
)

const ExhibitCard = ({ id }: { id: number }) => {
  const { data } = useQuery(GET_EXHIBIT, { variables: { id } })

  if (!data) return null

  const exhibit = data.getExhibit!
  const attributes = exhibit.attributes || []
  const hasAttributes = attributes.length > 0
  const hasMainImage = exhibit.mainImage !== null

  const notEmpty = (str: string | null) => str && str !== '<p></p>' && str

  const description = notEmpty(exhibit.description)
  const descriptionExtension = notEmpty(exhibit.descriptionExtension)

  return (
    <section>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading>{exhibit.title}</PageHeading>
          <ExhibitorChip exhibitor={exhibit.exhibitor} />
        </div>
      </Card>
      {(hasMainImage || hasAttributes) && (
        <Card className="mb-4">
          <div className="mt-8 flex flex-wrap gap-8">
            {hasMainImage && (
              <div
                className={`flex items-center justify-center ${
                  hasAttributes ? 'min-w-[300px] basis-1/3' : 'w-full'
                }`}>
                <img
                  src={`/api/exhibit/${exhibit.id}/image/main`}
                  alt={`Main image for ${exhibit.title}`}
                  className="block h-auto max-w-full"
                />
              </div>
            )}
            {hasAttributes && (
              <div className="min-w-[300px] flex-1">
                <KeyValueTable headers={['Attribut', 'Wert']}>
                  {attributes.map((attr, index) => (
                    <TableRow key={index}>
                      <TableCell>{attr.name}</TableCell>
                      <TableCell>{attr.value}</TableCell>
                    </TableRow>
                  ))}
                </KeyValueTable>
              </div>
            )}
          </div>
        </Card>
      )}
      {(description || descriptionExtension) && (
        <Article>
          {description && <ServerHtmlContent html={description} />}
          {descriptionExtension && <ServerHtmlContent html={descriptionExtension} />}
        </Article>
      )}
      {exhibit.table && (
        <div className="mt-3">
          <TableChip number={exhibit.table.number} />
        </div>
      )}
    </section>
  )
}

export default ExhibitCard
