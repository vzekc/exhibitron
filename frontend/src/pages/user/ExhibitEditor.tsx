import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import TextEditor, { TextEditorHandle } from '../../components/TextEditor.tsx'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.tsx'
import Confirm from '../../components/Confirm.tsx'
import ExhibitAttributeEditor from '../../components/ExhibitAttributeEditor.tsx'
import axios from 'axios'

const GET_DATA = graphql(`
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
    $attributes: [AttributeInput!]
  ) {
    updateExhibit(id: $id, title: $title, text: $text, table: $table, attributes: $attributes) {
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
    }
  }
`)

const CREATE_EXHIBIT = graphql(`
  mutation CreateExhibit(
    $title: String!
    $text: String
    $table: Int
    $attributes: [AttributeInput!]
  ) {
    createExhibit(title: $title, text: $text, table: $table, attributes: $attributes) {
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

const DELETE_EXHIBIT = graphql(`
  mutation DeleteExhibit($id: Int!) {
    deleteExhibit(id: $id)
  }
`)

type Attribute = {
  name: string
  value: string
}
const ExhibitEditor = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const apolloClient = useApolloClient()
  const isNew = id === 'new'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteImageConfirm, setShowDeleteImageConfirm] = useState(false)
  const [mainImage, setMainImage] = useState<number | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [originalTitle, setOriginalTitle] = useState('')
  const [originalTable, setOriginalTable] = useState<number | undefined>(undefined)
  const [originalAttributes, setOriginalAttributes] = useState<Attribute[]>([])
  const [isTextEdited, setIsTextEdited] = useState(false)

  const [updateExhibit] = useMutation(UPDATE_EXHIBIT)
  const [createExhibit] = useMutation(CREATE_EXHIBIT)
  const [deleteExhibit] = useMutation(DELETE_EXHIBIT)

  const editorRef = useRef<TextEditorHandle>(null)

  useEffect(() => {
    if (exhibitData?.getExhibit) {
      const { title, table, text, attributes, mainImage } = exhibitData.getExhibit
      const newTitle = title || ''
      const newText = text || ''
      const newTable = table?.number || undefined
      const newAttributes = attributes || []

      setDetailName(location.pathname, newTitle)
      setTitle(newTitle)
      setText(newText)
      setSelectedTable(newTable)
      setAttributes(newAttributes as Attribute[])
      setMainImage(mainImage as number | null)
      setOriginalTitle(newTitle)
      setOriginalTable(newTable)
      setOriginalAttributes(newAttributes as Attribute[])
      setIsTextEdited(false)
    } else if (isNew) {
      setDetailName(location.pathname, 'Neues Exponat')
      setTitle('')
      setText('')
      setSelectedTable(undefined)
      setAttributes([])
      setMainImage(null)
      setOriginalTitle('')
      setOriginalTable(undefined)
      setOriginalAttributes([])
      setIsTextEdited(false)
    }
  }, [exhibitData, setDetailName, isNew])

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedTable(e.target.value ? Number(e.target.value) : undefined)

  const areAttributesEqual = (a: Attribute[], b: Attribute[]) => {
    if (a.length !== b.length) return false

    for (let i = 0; i < a.length; i++) {
      if (a[i].name !== b[i].name || a[i].value !== b[i].value) {
        return false
      }
    }

    return true
  }

  const hasChanges =
    (title || '') !== (originalTitle || '') ||
    isTextEdited ||
    selectedTable !== originalTable ||
    !areAttributesEqual(attributes, originalAttributes)

  useUnsavedChangesWarning(hasChanges)

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Bitte gib einen Titel für das Exponat ein')
      return
    }

    const currentText = editorRef.current?.getHTML() || ''
    const validAttributes = attributes
      .filter((attr) => attr.name && attr.value)
      .map(({ name, value }) => ({ name, value }))

    await apolloClient.resetStore()
    // When saving, we need to retrieve the text from the server as it will be
    // processed to remove unwanted HTML and to externalize inline images.
    if (isNew) {
      const result = await createExhibit({
        variables: {
          title,
          text: currentText,
          table: selectedTable || null,
          attributes: validAttributes.length > 0 ? validAttributes : undefined,
        },
      })
      const {
        id: savedId,
        text: savedText,
        attributes: savedAttributes,
      } = result.data!.createExhibit!
      navigate(`/user/exhibit/${savedId}`)
      setText(savedText!)
      setAttributes((savedAttributes as Attribute[]) || [])
      setOriginalAttributes((savedAttributes as Attribute[]) || [])
      setIsTextEdited(false)
    } else {
      const result = await updateExhibit({
        variables: {
          id: Number(id),
          title,
          text: currentText,
          table: selectedTable || null,
          attributes: validAttributes.length > 0 ? validAttributes : undefined,
        },
      })
      const { text: savedText, attributes: savedAttributes } = result.data!.updateExhibit!
      setOriginalTitle(title)
      setOriginalTable(selectedTable)
      setText(savedText!)
      setAttributes((savedAttributes as Attribute[]) || [])
      setOriginalAttributes((savedAttributes as Attribute[]) || [])
      setIsTextEdited(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    await deleteExhibit({ variables: { id: Number(id) } })
    await apolloClient.clearStore()
    navigate('/user/exhibit')
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !id || id === 'new') return

    setIsImageLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      await axios.put(`/api/exhibit/${id}/image/main`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      await apolloClient.refetchQueries({
        include: [GET_DATA],
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Fehler beim Hochladen des Bildes')
    } finally {
      setIsImageLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteImage = async () => {
    setShowDeleteImageConfirm(true)
  }

  const handleConfirmDeleteImage = async () => {
    if (!id || id === 'new' || !mainImage) return

    setIsImageLoading(true)
    await axios.delete(`/api/exhibit/${id}/image/main`)
    setMainImage(null)

    await apolloClient.refetchQueries({
      include: [GET_DATA],
    })
    setIsImageLoading(false)
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

        <div className="main-image-section" style={{ marginBottom: '2rem' }}>
          <h3>Hauptbild</h3>
          {isImageLoading ? (
            <p>Bild wird verarbeitet...</p>
          ) : mainImage ? (
            <div style={{ marginBottom: '1rem' }}>
              <img
                src={`/api/exhibit/${id}/image/main`}
                alt="Hauptbild"
                style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'contain' }}
              />
              <div style={{ marginTop: '0.5rem' }}>
                <button className="secondary" onClick={() => fileInputRef.current?.click()}>
                  Bild ersetzen
                </button>
                <button
                  className="secondary outline"
                  onClick={handleDeleteImage}
                  style={{ marginLeft: '0.5rem' }}>
                  Bild löschen
                </button>
                <Confirm
                  isOpen={showDeleteImageConfirm}
                  title="Haupbild löschen"
                  message={`Möchtest Du das Haupbild wirklich löschen?`}
                  confirm="Löschen"
                  cancel="Abbrechen"
                  onConfirm={handleConfirmDeleteImage}
                  onClose={() => setShowDeleteImageConfirm(false)}
                />
              </div>
            </div>
          ) : (
            <div>
              <p>Kein Hauptbild vorhanden</p>
              <button className="secondary" onClick={() => fileInputRef.current?.click()}>
                Bild hochladen
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        <ExhibitAttributeEditor attributes={attributes} onChange={setAttributes} />

        <TextEditor
          ref={editorRef}
          defaultValue={text}
          onEditStateChange={(edited) => setIsTextEdited(edited)}
        />
        <div className="button-group">
          <button onClick={handleSave} disabled={!isNew && !hasChanges}>
            {isNew ? 'Erstellen' : 'Speichern'}
          </button>
          {!isNew && (
            <button onClick={handleDelete} className="danger">
              Löschen
            </button>
          )}
        </div>
        <Confirm
          isOpen={showDeleteConfirm}
          title="Exponat löschen"
          message={`Möchtest Du das Exponat "${title}" wirklich löschen?`}
          confirm="Löschen"
          cancel="Abbrechen"
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      </article>
    </div>
  )
}

export default ExhibitEditor
