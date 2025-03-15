import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import TextEditor from '../../components/TextEditor.tsx'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
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
  mutation UpdateExhibit($id: Int!, $title: String, $text: String, $table: Int) {
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

const CREATE_EXHIBIT = graphql(`
  mutation CreateExhibit($title: String!, $text: String, $table: Int) {
    createExhibit(title: $title, text: $text, table: $table) {
      id
      title
      text
      table {
        number
      }
    }
  }
`)

const GET_MY_TABLES = graphql(`
  query GetMyTables {
    getCurrentExhibitor {
      tables {
        number
      }
    }
  }
`)

const ExhibitEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const apolloClient = useApolloClient()
  const isNew = id === 'new'

  const {
    data: exhibitData,
    loading: exhibitLoading,
    error: exhibitError,
  } = useQuery(GET_DATA, {
    variables: { id: Number(id) },
    skip: isNew,
  })

  const { data: tablesData } = useQuery(GET_MY_TABLES, {
    skip: !isNew,
  })

  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [selectedTable, setSelectedTable] = useState<number | undefined>(undefined)
  const [originalTitle, setOriginalTitle] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [originalTable, setOriginalTable] = useState<number | undefined>(undefined)

  const [updateExhibit] = useMutation(UPDATE_EXHIBIT)
  const [createExhibit] = useMutation(CREATE_EXHIBIT)

  useEffect(() => {
    if (exhibitData?.getExhibit) {
      const { title, table, text } = exhibitData.getExhibit
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
    } else if (isNew) {
      setDetailName(location.pathname, 'Neues Exponat')
      setTitle('')
      setText('')
      setSelectedTable(undefined)
      setOriginalTitle('')
      setOriginalText('')
      setOriginalTable(undefined)
    }
  }, [exhibitData, setDetailName, isNew])

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedTable(e.target.value ? Number(e.target.value) : undefined)

  const hasChanges =
    (title || '') !== (originalTitle || '') ||
    (text || '') !== (originalText || '') ||
    selectedTable !== originalTable

  useUnsavedChangesWarning(hasChanges)

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Bitte gib einen Titel für das Exponat ein')
      return
    }

    await apolloClient.resetStore()
    // When saving, we need to retrieve the text from the server as it will be
    // processed to remove unwanted HTML and to externalize inline images.
    if (isNew) {
      const result = await createExhibit({
        variables: { title, text, table: selectedTable || null },
      })
      const { id: savedId, text: savedText } = result.data!.createExhibit!
      navigate(`/user/exhibit/${savedId}`)
      setText(savedText!)
    } else {
      const result = await updateExhibit({
        variables: { id: Number(id), title, text, table: selectedTable || null },
      })
      const { text: savedText } = result.data!.updateExhibit!
      setOriginalTitle(title)
      setOriginalText(savedText!)
      setOriginalTable(selectedTable)
      setText(savedText!)
    }
  }

  if (!isNew) {
    if (exhibitLoading) {
      return <p>Lade Exponat...</p>
    }

    if (exhibitError) {
      return <p>Fehler beim Laden des Exponats: {exhibitError.message}</p>
    }

    if (!exhibitData?.getExhibit) {
      return <p>Exponat nicht gefunden</p>
    }
  }

  const tables = isNew
    ? tablesData?.getCurrentExhibitor?.tables?.map((table) => table.number)
    : exhibitData?.getExhibit?.exhibitor?.tables?.map((table) => table.number)

  return (
    <div>
      <h1>{isNew ? 'Neues Exponat erstellen' : 'Exponat bearbeiten'}</h1>
      <article>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel eingeben..."
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
        <button onClick={handleSave} disabled={!isNew && !hasChanges}>
          {isNew ? 'Erstellen' : 'Speichern'}
        </button>
      </article>
    </div>
  )
}

export default ExhibitEditor
