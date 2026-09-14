import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
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

/*
 * The names an exhibitor can pick for a data sheet. Every name anybody has
 * ever typed lands here, so this is where an admin fixes a typo or folds two
 * spellings into one; renaming carries the data sheets along.
 */
const ExhibitAttributes = () => {
  const { loading, error, data, refetch } = useQuery(GET_ATTRIBUTES, {
    fetchPolicy: 'cache-and-network',
  })
  const [rename] = useMutation(RENAME)
  const [remove] = useMutation(DELETE)
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const attributes = [...(data?.getExhibitAttributes ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  )

  const complain = async (message: string) => {
    await showMessage('Das ging nicht', message, 'OK')
  }

  const exhibits = (count: number) => `${count} Exponat${count === 1 ? '' : 'en'}`

  const saveName = async () => {
    if (!editing) return
    const attribute = attributes.find((each) => each.id === editing.id)
    const name = editing.name.trim()
    if (!attribute || !name || name === attribute.name) {
      setEditing(null)
      return
    }
    const target = attributes.find((each) => each.name === name && each.id !== attribute.id)
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

  const deleteAttribute = async (attribute: (typeof attributes)[number]) => {
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

  return (
    <>
      <PageHeading>Attribute der Datenblätter</PageHeading>

      <Card>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Jeder Name, den jemand auf einem Datenblatt eingetragen hat, steht hier zur Auswahl. Ein
          umbenanntes Attribut wird auf allen Datenblättern umbenannt; ein Name, den es schon gibt,
          legt beide zusammen. Gelöscht werden kann nur, was auf keinem Datenblatt steht.
        </p>
        <PlainTable headers={['Name', 'Exponate', '']}>
          {attributes.map((attribute) => (
            <TableRow key={attribute.id}>
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
            </TableRow>
          ))}
        </PlainTable>
        {!attributes.length && (
          <p className="p-4 text-gray-500 dark:text-gray-400">Noch keine Attribute.</p>
        )}
      </Card>
    </>
  )
}

export default ExhibitAttributes
