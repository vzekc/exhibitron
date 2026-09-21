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
      standardOrder
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
      className={`flex items-center space-x-4 rounded p-2 ${
        isDragging ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'
      } mb-2 border border-gray-200 dark:border-gray-600`}>
      {/* Drag handle */}
      <div className="flex-shrink-0 cursor-move text-gray-400 dark:text-gray-500">
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
      <div className="min-w-[180px] flex-shrink-0 font-medium text-gray-900 dark:text-gray-100">
        {attr.name}
      </div>

      {/* Value input */}
      <div className="flex-grow">
        <input
          type="text"
          value={attr.value}
          onChange={(e) => handleAttributeValueChange(index, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          placeholder="Wert"
          className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
        />
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => handleRemoveAttribute(index)}
        className="flex-shrink-0 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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

/* A standard attribute stands on every sheet, so its row is neither moved nor removed. */
const StandardAttributeItem = ({
  attr,
  onValueChange,
}: {
  attr: Attribute
  onValueChange: (value: string) => void
}) => (
  <div className="mb-2 flex items-center space-x-4 rounded border border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
    <div className="w-6 flex-shrink-0" />
    <div className="min-w-[180px] flex-shrink-0 font-medium text-gray-900 dark:text-gray-100">
      {attr.name}
    </div>
    <div className="flex-grow">
      <input
        type="text"
        value={attr.value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
        placeholder="Wert"
        className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />
    </div>
    <div className="w-9 flex-shrink-0" />
  </div>
)

/*
 * The sheet shows the standard attributes first, in their order, each with the
 * exhibit's value or an empty one, and after them whatever else the exhibitor has
 * added, which can be reordered and removed. `attributes` is the exhibit's list as
 * saved; every change hands back the standard rows followed by the extras, and the
 * editor drops the rows without a value when it saves.
 */
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

  const availableAttributes = attributesData?.getExhibitAttributes || []
  const standardNames = availableAttributes
    .filter((attribute) => attribute.standardOrder != null)
    .map((attribute) => attribute.name)

  // Each standard name takes the first row of the sheet that carries it; the rest are extras.
  const taken = new Set<number>()
  const standardRows: Attribute[] = standardNames.map((name) => {
    const index = attributes.findIndex((attr, i) => attr.name === name && !taken.has(i))
    if (index >= 0) taken.add(index)
    return { name, value: index >= 0 ? attributes[index].value : '' }
  })
  const extras = attributes.filter((_, i) => !taken.has(i))

  const emit = (standard: Attribute[], rest: Attribute[]) => onChange([...standard, ...rest])

  const handleStandardValueChange = (index: number, value: string) => {
    const newStandard = [...standardRows]
    newStandard[index] = { ...newStandard[index], value }
    emit(newStandard, extras)
  }

  const handleAttributeValueChange = (index: number, value: string) => {
    const newExtras = [...extras]
    newExtras[index] = { ...newExtras[index], value }
    emit(standardRows, newExtras)
  }

  const handleRemoveAttribute = (index: number) => {
    const newExtras = [...extras]
    newExtras.splice(index, 1)
    emit(standardRows, newExtras)
  }

  const moveAttribute = (dragIndex: number, hoverIndex: number) => {
    const newExtras = [...extras]
    const [dragged] = newExtras.splice(dragIndex, 1)
    newExtras.splice(hoverIndex, 0, dragged)
    emit(standardRows, newExtras)
  }

  const handleCreateNewAttribute = async (name: string) => {
    const trimmedName = name.trim()
    if (trimmedName && !trimmedName.includes(':')) {
      const result = await createExhibitAttribute({
        variables: { name: trimmedName },
        refetchQueries: [{ query: GET_EXHIBIT_ATTRIBUTES }],
      })
      if (result.errors?.length) {
        await showMessage(
          'Attribut konnte nicht angelegt werden',
          result.errors[0]?.message || 'Unbekannter Fehler',
        )
        return false
      }
      return true
    } else if (trimmedName.includes(':')) {
      await showMessage('Ungültiger Name', 'Attributnamen dürfen keine Doppelpunkte enthalten.')
      return false
    }
    return false
  }

  const handleSelectAttribute = (name: string) => {
    emit(standardRows, [...extras, { name, value: '' }])
    setShowAddAttributeInput(false)
  }

  const handleCreateAttributeFromComboBox = async (name: string) => {
    const success = await handleCreateNewAttribute(name)
    if (success) {
      // After creation, add the new attribute to the list
      handleSelectAttribute(name)
    }
  }

  const onSheet = new Set([...standardNames, ...extras.map((attr) => attr.name)])
  const selectable = availableAttributes.filter((attribute) => !onSheet.has(attribute.name))

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="rounded-lg bg-white p-2 dark:bg-gray-800">
        {standardRows.length === 0 && extras.length === 0 ? (
          <p className="mb-4 italic text-gray-500 dark:text-gray-400">Keine Attribute vorhanden</p>
        ) : (
          <div className="mb-4">
            {standardRows.map((attr, index) => (
              <StandardAttributeItem
                key={attr.name}
                attr={attr}
                onValueChange={(value) => handleStandardValueChange(index, value)}
              />
            ))}
            {extras.map((attr, index) => (
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
          <div className="mb-4 rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
            <ExhibitAttributeSelector
              options={selectable}
              onSelect={handleSelectAttribute}
              onCreateNew={handleCreateAttributeFromComboBox}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddAttributeInput(false)}
                className="rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex space-x-2">
            <button
              type="button"
              onClick={() => setShowAddAttributeInput(true)}
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
