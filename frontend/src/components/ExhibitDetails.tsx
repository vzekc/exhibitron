import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import './Card.css'

const GET_EXHIBIT = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      text
      table {
        number
      }
    }
  }
`)

const ExhibitDetails = ({ id }: { id: number }) => {
  const { data } = useQuery(GET_EXHIBIT, { variables: { id } })

  if (!data) return null

  const exhibit = data.getExhibit!

  return (
    <section className="card">
      <h1 className="card-title">{exhibit.title}</h1>
      <div
        className="card-content"
        dangerouslySetInnerHTML={{ __html: exhibit.text || '' }}
      />
      {exhibit.table && (
        <div className="card-footer">Tisch {exhibit.table.number}</div>
      )}
    </section>
  )
}

export default ExhibitDetails
