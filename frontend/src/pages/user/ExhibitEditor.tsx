import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { TextEditor } from '../../components/TextEditor.tsx'
import { MilkdownProvider } from '@milkdown/react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { useMutation } from '@apollo/client'

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
  const [updateExhibit] = useMutation(UPDATE_EXHIBIT)

  useEffect(() => {
    if (data?.getExhibit) {
      const { title, table, text } = data.getExhibit
      setDetailName(title)
      setTitle(title)
      setText(text || '')
      setSelectedTable(table?.number || undefined)
    }
  }, [data, setDetailName])

  const handleTitleChange = (e: ContentEditableEvent) =>
    setTitle(e.target.value)

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedTable(e.target.value ? Number(e.target.value) : undefined)

  const handleSave = async () => {
    console.log(text)
    await updateExhibit({
      variables: { id: Number(id), title, text, table: selectedTable || null },
    })
  }

  if (loading) {
    return <p>Lade Ausstellung...</p>
  }

  if (error) {
    return <p>Fehler beim Laden der Ausstellung: {error.message}</p>
  }

  if (!data?.getExhibit) {
    return <p>Ausstellung nicht gefunden</p>
  }

  const exhibit = data?.getExhibit
  const tables = exhibit.exhibitor.tables?.map((table) => table.number)

  return (
    <MilkdownProvider>
      <h1>Ausstellung bearbeiten</h1>
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
        <TextEditor markdown={text} onChange={setText} />
        <button onClick={handleSave}>Speichern</button>
      </article>
    </MilkdownProvider>
  )
}

export default ExhibitEditor
