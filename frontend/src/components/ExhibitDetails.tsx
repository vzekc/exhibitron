import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import './Card.css'
import React from 'react'
import ExhibitorLink from './ExhibitorLink'

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
      mainImage
      exhibitor {
        id
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
  const hasMainImage = exhibit.mainImage !== null

  return (
    <section className="card">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="card-title" style={{ margin: 0, fontSize: '1.5rem' }}>
            {exhibit.title}
          </h1>
          <ExhibitorLink id={exhibit.exhibitor.id} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {hasMainImage && (
            <div className="card-image" style={{ marginRight: '1rem', flexShrink: 0 }}>
              <img
                src={`/api/exhibit/${exhibit.id}/image/main`}
                alt={`Main image for ${exhibit.title}`}
                style={{ maxWidth: '600px', maxHeight: '600px', objectFit: 'contain' }}
              />
            </div>
          )}
          {hasAttributes && (
            <div className="card-attributes" style={{ marginLeft: 'auto' }}>
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
      </div>
      <div className="card-content" dangerouslySetInnerHTML={{ __html: exhibit.text || '' }} />

      {exhibit.table && <div className="card-footer">Tisch {exhibit.table.number}</div>}
    </section>
  )
}

export default ExhibitDetails
