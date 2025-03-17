import { useState } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useQuery } from '@apollo/client'

const GET_EXHIBIT_ATTRIBUTES = graphql(`
  query GetExhibitAttributes {
    getExhibitAttributes {
      id
      name
    }
  }
`)

const CREATE_EXHIBIT_ATTRIBUTE = graphql(`
  mutation CreateExhibitAttribute($name: String!) {
    createExhibitAttribute(name: $name) {
      id
      name
    }
  }
`)

type Attribute = {
  name: string
  value: string
}

interface ExhibitAttributeEditorProps {
  attributes: Attribute[]
  onChange: (attributes: Attribute[]) => void
}

const ExhibitAttributeEditor = ({ attributes, onChange }: ExhibitAttributeEditorProps) => {
  const [showNewAttributeInput, setShowNewAttributeInput] = useState(false)
  const [newAttributeName, setNewAttributeName] = useState('')

  const { data: attributesData } = useQuery(GET_EXHIBIT_ATTRIBUTES)
  const [createExhibitAttribute] = useMutation(CREATE_EXHIBIT_ATTRIBUTE)

  const handleAddAttribute = () => {
    onChange([...attributes, { name: '', value: '' }])
  }

  const handleAttributeNameChange = (index: number, name: string) => {
    const newAttributes = [...attributes]
    newAttributes[index] = { ...newAttributes[index], name }
    onChange(newAttributes)
  }

  const handleAttributeValueChange = (index: number, value: string) => {
    const newAttributes = [...attributes]
    newAttributes[index] = { ...newAttributes[index], value }
    onChange(newAttributes)
  }

  const handleRemoveAttribute = (index: number) => {
    const newAttributes = [...attributes]
    newAttributes.splice(index, 1)
    onChange(newAttributes)
  }

  const handleCreateNewAttribute = async () => {
    if (newAttributeName.trim()) {
      await createExhibitAttribute({
        variables: { name: newAttributeName.trim() },
        refetchQueries: [{ query: GET_EXHIBIT_ATTRIBUTES }],
      })
      setNewAttributeName('')
      setShowNewAttributeInput(false)
    }
  }

  const availableAttributes = attributesData?.getExhibitAttributes || []

  return (
    <div className="attributes-section">
      <h3>Attribute</h3>
      {attributes.length === 0 ? (
        <p>Keine Attribute vorhanden</p>
      ) : (
        <div className="attributes-list">
          {attributes.map((attr, index) => (
            <div key={index} className="attribute-item grid" style={{ marginBottom: '1rem' }}>
              <div>
                <select
                  value={attr.name}
                  onChange={(e) => handleAttributeNameChange(index, e.target.value)}>
                  <option value="">Attribut auswählen</option>
                  {availableAttributes.map((availableAttr) => (
                    <option key={availableAttr.id} value={availableAttr.name}>
                      {availableAttr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={attr.value}
                  onChange={(e) => handleAttributeValueChange(index, e.target.value)}
                  placeholder="Wert"
                />
              </div>
              <div>
                <button className="secondary outline" onClick={() => handleRemoveAttribute(index)}>
                  Entfernen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="attribute-actions" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <button className="secondary" onClick={handleAddAttribute}>
          Attribut hinzufügen
        </button>
        <button
          className="secondary"
          onClick={() => setShowNewAttributeInput(true)}
          style={{ marginLeft: '0.5rem' }}>
          Neues Attribut erstellen
        </button>
      </div>

      {showNewAttributeInput && (
        <div className="new-attribute-form grid" style={{ marginBottom: '2rem' }}>
          <div>
            <input
              type="text"
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              placeholder="Name des neuen Attributs"
            />
          </div>
          <div>
            <button onClick={handleCreateNewAttribute}>Erstellen</button>
            <button
              className="secondary outline"
              onClick={() => {
                setShowNewAttributeInput(false)
                setNewAttributeName('')
              }}
              style={{ marginLeft: '0.5rem' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExhibitAttributeEditor
