import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TextEditor from '../../components/TextEditor.tsx'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { useMutation } from '@apollo/client'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning'

const GET_DATA = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      text
      table {
        number
      }
      exhibitor {
        id
        tables {
          number
        }
      }
    }
  }
`)

const UPDATE_EXHIBIT = graphql(`
  mutation UpdateExhibit(
    $id: Int!
    $title: String
    $text: String
    $table: Int
  ) {
    updateExhibit(id: $id, title: $title, text: $text, table: $table) {
      id
      title
      text
      table {
        number
      }
    }
  }
`)

const ExhibitEditor = () => {
  const { id } = useParams<{ id: string }>()
  const { setDetailName } = useBreadcrumb()
  const { data, loading, error } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
  })
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [selectedTable, setSelectedTable] = useState<number | undefined>(
    undefined,
  )
  const [originalTitle, setOriginalTitle] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [originalTable, setOriginalTable] = useState<number | undefined>(
    undefined,
  )
  const [updateExhibit] = useMutation(UPDATE_EXHIBIT)

  useEffect(() => {
    if (data?.getExhibit) {
      const { title, table, text } = data.getExhibit
      const newTitle = title || ''
      const newText = text || ''
      const newTable = table?.number || undefined

      setDetailName(location.pathname, newTitle)
      setTitle(newTitle)
      setText(newText)
      setSelectedTable(newTable)
      setOriginalTitle(newTitle)
      setOriginalText(newText)
      setOriginalTable(newTable)
    }
  }, [data, setDetailName])

  const handleTitleChange = (e: ContentEditableEvent) =>
    setTitle(e.target.value)

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedTable(e.target.value ? Number(e.target.value) : undefined)

  const hasChanges =
    (title || '') !== (originalTitle || '') ||
    (text || '') !== (originalText || '') ||
    selectedTable !== originalTable

  useUnsavedChangesWarning(hasChanges)

  const handleSave = async () => {
    await updateExhibit({
      variables: { id: Number(id), title, text, table: selectedTable || null },
    })
    setOriginalTitle(title)
    setOriginalText(text)
    setOriginalTable(selectedTable)
  }

  if (loading) {
    return <p>Lade Exponat...</p>
  }

  if (error) {
    return <p>Fehler beim Laden des Exponats: {error.message}</p>
  }

  if (!data?.getExhibit) {
    return <p>Exponat nicht gefunden</p>
  }

  const exhibit = data?.getExhibit
  const tables = exhibit.exhibitor.tables?.map((table) => table.number)

  return (
    <div>
      <h1>Exponat bearbeiten</h1>
      <article>
        <ContentEditable
          html={title}
          onChange={handleTitleChange}
          tagName="h2"
        />
        <label>
          Tisch
          <select value={selectedTable} onChange={handleTableChange}>
            <option value="">Kein Tisch</option>
            {tables?.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </label>
        <TextEditor
          defaultValue={text}
          onChange={(html) => {
            setText(html)
          }}
        />
        <button onClick={handleSave} disabled={!hasChanges}>
          Speichern
        </button>
      </article>
    </div>
  )
}

export default ExhibitEditor
