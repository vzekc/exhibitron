import { useState, useRef } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useQuery } from '@apollo/client'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

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

// Item Types for drag and drop
const ItemTypes = {
  ATTRIBUTE: 'attribute',
}

interface DraggableAttributeItemProps {
  index: number
  attr: Attribute
  moveAttribute: (dragIndex: number, hoverIndex: number) => void
  handleAttributeNameChange: (index: number, name: string) => void
  handleAttributeValueChange: (index: number, value: string) => void
  handleRemoveAttribute: (index: number) => void
  availableAttributes: Array<{ id: number; name: string }>
}

const DraggableAttributeItem = ({
  index,
  attr,
  moveAttribute,
  handleAttributeNameChange,
  handleAttributeValueChange,
  handleRemoveAttribute,
  availableAttributes,
}: DraggableAttributeItemProps) => {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ATTRIBUTE,
    item: () => ({ index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: ItemTypes.ATTRIBUTE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return
      }

      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect()

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Determine mouse position
      const clientOffset = monitor.getClientOffset()

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Time to actually perform the action
      moveAttribute(dragIndex, hoverIndex)

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
    },
  })

  drag(drop(ref))

  return (
    <div
      ref={ref}
      className="attribute-item grid"
      style={{
        marginBottom: '1rem',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: '0.5rem',
        border: '1px dashed #ccc',
        backgroundColor: '#f9f9f9',
      }}>
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
  )
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

  const moveAttribute = (dragIndex: number, hoverIndex: number) => {
    const newAttributes = [...attributes]
    const draggedAttribute = newAttributes[dragIndex]

    // Remove the dragged item
    newAttributes.splice(dragIndex, 1)
    // Insert it at the new position
    newAttributes.splice(hoverIndex, 0, draggedAttribute)

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
    <DndProvider backend={HTML5Backend}>
      <div className="attributes-section">
        <h3>Attribute</h3>
        {attributes.length === 0 ? (
          <p>Keine Attribute vorhanden</p>
        ) : (
          <div className="attributes-list">
            {attributes.map((attr, index) => (
              <DraggableAttributeItem
                key={index}
                index={index}
                attr={attr}
                moveAttribute={moveAttribute}
                handleAttributeNameChange={handleAttributeNameChange}
                handleAttributeValueChange={handleAttributeValueChange}
                handleRemoveAttribute={handleRemoveAttribute}
                availableAttributes={availableAttributes}
              />
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
    </DndProvider>
  )
}

export default ExhibitAttributeEditor
