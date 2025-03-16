import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import './Card.css'
import React from 'react'

const GET_EXHIBIT = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      text
      table {
        number
      }
      attributes {
        name
        value
      }
    }
  }
`)

const ExhibitDetails = ({ id }: { id: number }) => {
  const { data } = useQuery(GET_EXHIBIT, { variables: { id } })

  if (!data) return null

  const exhibit = data.getExhibit!
  const attributes = exhibit.attributes || []
  const hasAttributes = attributes.length > 0

  return (
    <section className="card">
      <div>
        <h1 style={{ float: 'left' }} className="card-title">
          {exhibit.title}
        </h1>
        {hasAttributes && (
          <div className="card-attributes" style={{ margin: '1rem 0', float: 'right' }}>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '0.5rem',
                margin: 0,
              }}>
              {attributes.map((attr, index) => (
                <React.Fragment key={index}>
                  <dt style={{ fontWeight: 'bold' }}>{attr.name}</dt>
                  <dd style={{ margin: 0 }}>{attr.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        )}
      </div>
      <div className="card-content" dangerouslySetInnerHTML={{ __html: exhibit.text || '' }} />

      {exhibit.table && <div className="card-footer">Tisch {exhibit.table.number}</div>}
    </section>
  )
}

export default ExhibitDetails
