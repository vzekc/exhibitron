import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql, ResultOf } from 'gql.tada'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import Button from '@components/Button'
import FormInput from '@components/FormInput'
import LoadInProgress from '@components/LoadInProgress'
import { TableRow, TableCell } from '@components/Table'
import PlainTable from '@components/volunteer/PlainTable'
import { showMessage } from '@components/MessageModalUtil'
import { showConfirm } from '@components/ConfirmUtil'

const GET_ATTRIBUTES = graphql(`
  query GetExhibitAttributesForAdmin {
    getExhibitAttributes {
      id
      name
      exhibitCount
      standardOrder
    }
  }
`)

const RENAME = graphql(`
  mutation RenameExhibitAttribute($id: Int!, $name: String!) {
    renameExhibitAttribute(id: $id, name: $name) {
      id
      name
      exhibitCount
    }
  }
`)

const DELETE = graphql(`
  mutation DeleteExhibitAttribute($id: Int!) {
    deleteExhibitAttribute(id: $id)
  }
`)

const SET_STANDARD = graphql(`
  mutation SetStandardExhibitAttributes($ids: [Int!]!) {
    setStandardExhibitAttributes(ids: $ids) {
      id
      name
      exhibitCount
      standardOrder
    }
  }
`)

type Attribute = ResultOf<typeof GET_ATTRIBUTES>['getExhibitAttributes'][number]

const DRAG_TYPE = 'standard-attribute'

const DragHandle = () => (
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
)

/*
 * A row of the standard block. Dragging it over another row swaps the two in the
 * list as the pointer passes the row's middle, and letting go saves the order.
 */
const StandardRow = ({
  index,
  move,
  onDrop,
  children,
}: {
  index: number
  move: (from: number, to: number) => void
  onDrop: () => void
  children: React.ReactNode
}) => {
  const ref = useRef<HTMLTableRowElement>(null)
  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: onDrop,
  })
  const [, drop] = useDrop({
    accept: DRAG_TYPE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current || item.index === index) return
      const rect = ref.current.getBoundingClientRect()
      const middle = (rect.bottom - rect.top) / 2
      const y = monitor.getClientOffset()!.y - rect.top
      if (item.index < index && y < middle) return
      if (item.index > index && y > middle) return
      move(item.index, index)
      item.index = index
    },
  })
  drag(drop(ref))
  return (
    <TableRow ref={ref} className={isDragging ? 'opacity-40' : ''}>
      <TableCell className="w-8 cursor-move text-gray-400 dark:text-gray-500">
        <DragHandle />
      </TableCell>
      {children}
    </TableRow>
  )
}

/*
 * The names an exhibitor can pick for a data sheet. Every name anybody has
 * ever typed lands here, so this is where an admin fixes a typo or folds two
 * spellings into one; renaming carries the data sheets along. The standard
 * attributes stand on every sheet, in the order they have here.
 */
const ExhibitAttributes = () => {
  const { loading, error, data, refetch } = useQuery(GET_ATTRIBUTES, {
    fetchPolicy: 'cache-and-network',
  })
  const [rename] = useMutation(RENAME)
  const [remove] = useMutation(DELETE)
  const [setStandard] = useMutation(SET_STANDARD)
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)

  // The standard block as it is being dragged; the server's order takes over on every load.
  // The ref carries the same list, kept current by hand, so that the drop, which can come
  // before React has committed the last swap, saves what the pointer left behind.
  const [standardIds, setStandardIds] = useState<number[]>([])
  const standardIdsRef = useRef(standardIds)
  const updateStandardIds = (ids: number[]) => {
    standardIdsRef.current = ids
    setStandardIds(ids)
  }
  useEffect(() => {
    updateStandardIds(
      (data?.getExhibitAttributes ?? [])
        .filter((attribute) => attribute.standardOrder != null)
        .sort((a, b) => a.standardOrder! - b.standardOrder!)
        .map((attribute) => attribute.id),
    )
  }, [data])

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const all = data?.getExhibitAttributes ?? []
  const byId = new Map(all.map((attribute) => [attribute.id, attribute]))
  const standard = standardIds.map((id) => byId.get(id)).filter((a): a is Attribute => !!a)
  const others = all
    .filter((attribute) => !standardIds.includes(attribute.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const complain = async (message: string) => {
    await showMessage('Das ging nicht', message, 'OK')
  }

  const exhibits = (count: number) => `${count} Exponat${count === 1 ? '' : 'en'}`

  const saveStandard = async (ids: number[]) => {
    const result = await setStandard({ variables: { ids } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
    }
    await refetch()
  }

  const moveStandard = (from: number, to: number) => {
    const ids = [...standardIdsRef.current]
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    updateStandardIds(ids)
  }

  const saveName = async () => {
    if (!editing) return
    const attribute = byId.get(editing.id)
    const name = editing.name.trim()
    if (!attribute || !name || name === attribute.name) {
      setEditing(null)
      return
    }
    const target = all.find((each) => each.name === name && each.id !== attribute.id)
    if (target) {
      const ok = await showConfirm(
        'Attribute zusammenlegen',
        `„${name}“ gibt es schon. Die ${exhibits(attribute.exhibitCount)} mit „${attribute.name}“ bekommen stattdessen „${name}“, und „${attribute.name}“ verschwindet aus der Liste.`,
        'Zusammenlegen',
      )
      if (!ok) return
    }
    const result = await rename({ variables: { id: attribute.id, name } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    setEditing(null)
    await refetch()
  }

  const deleteAttribute = async (attribute: Attribute) => {
    const ok = await showConfirm(
      'Attribut löschen',
      `„${attribute.name}“ wird aus der Auswahl entfernt.`,
      'Löschen',
    )
    if (!ok) return
    const result = await remove({ variables: { id: attribute.id } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    await refetch()
  }

  const cells = (attribute: Attribute) => (
    <>
      <TableCell className="whitespace-normal">
        {editing?.id === attribute.id ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              saveName()
            }}>
            <FormInput
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ id: attribute.id, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
            />
            <Button type="submit" disabled={!editing.name.trim()}>
              Speichern
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Abbrechen
            </Button>
          </form>
        ) : (
          attribute.name
        )}
      </TableCell>
      <TableCell>{attribute.exhibitCount || '—'}</TableCell>
      <TableCell>
        {editing?.id !== attribute.id && (
          <span className="flex gap-2">
            {attribute.standardOrder != null ? (
              <Button
                variant="secondary"
                onClick={() =>
                  saveStandard(standardIdsRef.current.filter((id) => id !== attribute.id))
                }>
                Kein Standard
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => saveStandard([...standardIdsRef.current, attribute.id])}>
                Als Standard
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setEditing({ id: attribute.id, name: attribute.name })}>
              Umbenennen
            </Button>
            <Button
              variant="danger"
              disabled={attribute.exhibitCount > 0}
              title={
                attribute.exhibitCount > 0
                  ? `Steht noch auf ${exhibits(attribute.exhibitCount)}`
                  : undefined
              }
              onClick={() => deleteAttribute(attribute)}>
              Löschen
            </Button>
          </span>
        )}
      </TableCell>
    </>
  )

  return (
    <DndProvider backend={HTML5Backend}>
      <PageHeading>Attribute der Datenblätter</PageHeading>

      <Card className="mb-4">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Standard-Attribute
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Diese Attribute stehen auf jedem Datenblatt, in dieser Reihenfolge. Ziehen ordnet sie um.
        </p>
        <PlainTable headers={['', 'Name', 'Exponate', '']}>
          {standard.map((attribute, index) => (
            <StandardRow
              key={attribute.id}
              index={index}
              move={moveStandard}
              onDrop={() => saveStandard(standardIdsRef.current)}>
              {cells(attribute)}
            </StandardRow>
          ))}
        </PlainTable>
        {!standard.length && (
          <p className="p-4 text-gray-500 dark:text-gray-400">Noch keine Standard-Attribute.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Weitere Attribute
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Jeder Name, den jemand auf einem Datenblatt eingetragen hat, steht hier zur Auswahl. Ein
          umbenanntes Attribut wird auf allen Datenblättern umbenannt; ein Name, den es schon gibt,
          legt beide zusammen. Gelöscht werden kann nur, was auf keinem Datenblatt steht.
        </p>
        <PlainTable headers={['Name', 'Exponate', '']}>
          {others.map((attribute) => (
            <TableRow key={attribute.id}>{cells(attribute)}</TableRow>
          ))}
        </PlainTable>
        {!others.length && (
          <p className="p-4 text-gray-500 dark:text-gray-400">Keine weiteren Attribute.</p>
        )}
      </Card>
    </DndProvider>
  )
}

export default ExhibitAttributes
