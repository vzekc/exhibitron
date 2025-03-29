import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ExhibitorChip from './ExhibitorChip.tsx'
import TableChip from './TableChip.tsx'
import ServerHtmlContent from './ServerHtmlContent'
import PageHeading from './PageHeading'
import Table, { TableRow, TableCell } from './Table'
import Article from './Article'
import Card from '@components/Card.tsx'

const GET_EXHIBIT = graphql(
  `
    query GetExhibit($id: Int!) {
      getExhibit(id: $id) {
        id
        title
        description
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

  return (
    <section>
      <Card className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PageHeading>{exhibit.title}</PageHeading>
          <ExhibitorChip exhibitor={exhibit.exhibitor} />
        </div>
      </Card>
      {(hasMainImage || hasAttributes) && (
        <Card className="mb-4">
          <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
            {hasMainImage && (
              <div
                style={{
                  flexBasis: hasAttributes ? '33%' : '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: hasAttributes ? 0 : '2rem',
                }}>
                <img
                  src={`/api/exhibit/${exhibit.id}/image/main`}
                  alt={`Main image for ${exhibit.title}`}
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )}
            {hasAttributes && (
              <div style={{ flex: 1 }}>
                <Table headers={['Attribut', 'Wert']} variant="keyValue">
                  {attributes.map((attr, index) => (
                    <TableRow key={index}>
                      <TableCell>{attr.name}</TableCell>
                      <TableCell>{attr.value}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            )}
          </div>
        </Card>
      )}
      {exhibit.description && exhibit.description !== '<p></p>' && (
        <Article>
          <ServerHtmlContent html={exhibit.description} />
        </Article>
      )}

      {exhibit.table && <TableChip number={exhibit.table.number} />}
    </section>
  )
}

export default ExhibitCard
