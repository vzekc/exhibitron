import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, gql, useApolloClient } from '@apollo/client'
import useMandatoryParams from '../../utils/useMandatoryParams'
import ContentEditable from 'react-contenteditable'
import TextEditor, { TextEditorHandle } from '../../components/TextEditor.tsx'
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning'

const GET_PAGE = gql`
  query GetPage($key: String!) {
    getPage(key: $key) {
      id
      key
      title
      text
    }
  }
`

const CREATE_PAGE = gql`
  mutation CreatePage($key: String!, $title: String!, $text: String!) {
    createPage(key: $key, title: $title, text: $text) {
      id
      key
      title
      text
    }
  }
`

const UPDATE_PAGE = gql`
  mutation UpdatePage($id: Int!, $key: String!, $title: String!, $text: String!) {
    updatePage(id: $id, key: $key, title: $title, text: $text) {
      id
      key
      title
      text
    }
  }
`

const PageEditor = () => {
  const { key } = useMandatoryParams<{ key: string }>()
  const apolloClient = useApolloClient()
  const { loading, error, data } = useQuery(GET_PAGE, { variables: { key } })
  const [createPage] = useMutation(CREATE_PAGE)
  const [updatePage] = useMutation(UPDATE_PAGE)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [isTextEdited, setIsTextEdited] = useState(false)
  const editorRef = useRef<TextEditorHandle>(null)

  useEffect(() => {
    if (data?.getPage) {
      const newTitle = data.getPage.title || ''
      const newText = data.getPage.text || ''

      setTitle(newTitle)
      setText(newText)
      setOriginalTitle(newTitle)
      setIsTextEdited(false)
    }
  }, [data])

  const hasChanges = (title || '') !== (originalTitle || '') || isTextEdited

  useUnsavedChangesWarning(hasChanges)

  const handleSave = async () => {
    const currentText = editorRef.current?.getHTML() || ''
    let processedText: string

    if (data?.getPage?.id) {
      const result = await updatePage({
        variables: { id: data.getPage.id, key, title, text: currentText },
      })
      processedText = result!.data!.updatePage.text || ''
    } else {
      const result = await createPage({ variables: { key, title, text: currentText } })
      processedText = result!.data!.createPage.text || ''
    }
    setText(processedText)

    // Reset the Apollo cache to force a fresh load of all data
    await apolloClient.resetStore()
    setOriginalTitle(title)
    setIsTextEdited(false)
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <ContentEditable
        html={title}
        placeholder="Titel der Seite"
        onChange={(e) => setTitle(e.target.value)}
        className="editable-title"
        tagName="h2"
      />
      <TextEditor
        ref={editorRef}
        defaultValue={text}
        onEditStateChange={(edited) => setIsTextEdited(edited)}
      />
      <button onClick={handleSave} disabled={!hasChanges || !title}>
        Save
      </button>
    </div>
  )
}

export default PageEditor
