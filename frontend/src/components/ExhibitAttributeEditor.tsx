import { useState, useRef, useEffect } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useQuery } from '@apollo/client'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ExhibitAttributeSelector } from './ExhibitAttributeSelector.tsx'
import { showMessage } from './MessageModalUtil'

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
  handleAttributeValueChange: (index: number, value: string) => void
  handleRemoveAttribute: (index: number) => void
}

const DraggableAttributeItem = ({
  index,
  attr,
  moveAttribute,
  handleAttributeValueChange,
  handleRemoveAttribute,
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
      className={`flex items-center space-x-4 rounded p-2 ${isDragging ? 'bg-gray-100' : 'bg-white'} mb-2 border border-gray-200`}>
      {/* Drag handle */}
      <div className="flex-shrink-0 cursor-move text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          <line x1="8" y1="18" x2="16" y2="18"></line>
        </svg>
      </div>

      {/* Attribute name (displayed as label) */}
      <div className="min-w-[120px] flex-shrink-0 font-medium">{attr.name}</div>

      {/* Value input */}
      <div className="flex-grow">
        <input
          type="text"
          value={attr.value}
          onChange={(e) => handleAttributeValueChange(index, e.target.value)}
          placeholder="Wert"
          className="w-full rounded border border-gray-300 p-2"
        />
      </div>

      {/* Remove button */}
      <button
        onClick={() => handleRemoveAttribute(index)}
        className="flex-shrink-0 p-2 text-red-500 hover:text-red-700"
        aria-label="Entfernen">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  )
}

const ExhibitAttributeEditor = ({ attributes, onChange }: ExhibitAttributeEditorProps) => {
  const [showAddAttributeInput, setShowAddAttributeInput] = useState(false)

  const { data: attributesData } = useQuery(GET_EXHIBIT_ATTRIBUTES)
  const [createExhibitAttribute] = useMutation(CREATE_EXHIBIT_ATTRIBUTE)

  // Add event listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddAttributeInput) {
        setShowAddAttributeInput(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAddAttributeInput])

  const handleAddAttribute = () => {
    setShowAddAttributeInput(true)
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

  const handleCreateNewAttribute = async (name: string) => {
    const trimmedName = name.trim()
    if (trimmedName && !trimmedName.includes(':')) {
      try {
        await createExhibitAttribute({
          variables: { name: trimmedName },
          refetchQueries: [{ query: GET_EXHIBIT_ATTRIBUTES }],
        })
        return true
      } catch (error) {
        console.error('Error creating attribute:', error)
        return false
      }
    } else if (trimmedName.includes(':')) {
      await showMessage('Ungültiger Name', 'Attributnamen dürfen keine Doppelpunkte enthalten.')
      return false
    }
    return false
  }

  const handleSelectAttribute = (name: string) => {
    onChange([...attributes, { name, value: '' }])
    setShowAddAttributeInput(false)
  }

  const handleCreateAttributeFromComboBox = async (name: string) => {
    const success = await handleCreateNewAttribute(name)
    if (success) {
      // After creation, add the new attribute to the list
      handleSelectAttribute(name)
    }
  }

  const availableAttributes = attributesData?.getExhibitAttributes || []

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="rounded-lg bg-white p-2">
        {attributes.length === 0 ? (
          <p className="mb-4 italic text-gray-500">Keine Attribute vorhanden</p>
        ) : (
          <div className="mb-4">
            {attributes.map((attr, index) => (
              <DraggableAttributeItem
                key={index}
                index={index}
                attr={attr}
                moveAttribute={moveAttribute}
                handleAttributeValueChange={handleAttributeValueChange}
                handleRemoveAttribute={handleRemoveAttribute}
              />
            ))}
          </div>
        )}

        {showAddAttributeInput ? (
          <div className="mb-4 rounded border border-gray-200 p-3">
            <ExhibitAttributeSelector
              options={availableAttributes}
              onSelect={handleSelectAttribute}
              onCreateNew={handleCreateAttributeFromComboBox}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => setShowAddAttributeInput(false)}
                className="rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-400">
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleAddAttribute}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              Attribut hinzufügen
            </button>
          </div>
        )}
      </div>
    </DndProvider>
  )
}

export default ExhibitAttributeEditor
