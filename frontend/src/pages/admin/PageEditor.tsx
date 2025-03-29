import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, gql, useApolloClient } from '@apollo/client'
import useMandatoryParams from '@utils/useMandatoryParams'
import ContentEditable from 'react-contenteditable'
import TextEditor, { TextEditorHandle } from '@components/TextEditor.tsx'
import { useUnsavedChangesWarning } from '@hooks/useUnsavedChangesWarning.tsx'
import Button from '@components/Button.tsx'

const GET_PAGE = gql`
  query GetPage($key: String!) {
    getPage(key: $key) {
      id
      key
      title
      html
    }
  }
`

const CREATE_PAGE = gql`
  mutation CreatePage($key: String!, $title: String!, $html: String!) {
    createPage(key: $key, title: $title, html: $html) {
      id
      key
      title
      html
    }
  }
`

const UPDATE_PAGE = gql`
  mutation UpdatePage($id: Int!, $key: String!, $title: String!, $html: String!) {
    updatePage(id: $id, key: $key, title: $title, html: $html) {
      id
      key
      title
      html
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
  const [html, setHtml] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [isTextEdited, setIsTextEdited] = useState(false)
  const editorRef = useRef<TextEditorHandle>(null)

  useEffect(() => {
    if (data?.getPage) {
      const newTitle = data.getPage.title || ''
      const newHtml = data.getPage.html || ''

      setTitle(newTitle)
      setHtml(newHtml)
      setOriginalTitle(newTitle)
      setIsTextEdited(false)
    }
  }, [data])

  const hasChanges = (title || '') !== (originalTitle || '') || isTextEdited

  useUnsavedChangesWarning(hasChanges)

  const handleSave = async () => {
    const currentHtml = editorRef.current?.getHTML() || ''
    let processedHtml: string

    if (data?.getPage?.id) {
      const result = await updatePage({
        variables: { id: data.getPage.id, key, title, html: currentHtml },
      })
      processedHtml = result!.data!.updatePage.html || ''
    } else {
      const result = await createPage({ variables: { key, title, html: currentHtml } })
      processedHtml = result!.data!.createPage.html || ''
    }
    setHtml(processedHtml)

    // Reset the Apollo cache to force a fresh load of all data
    await apolloClient.resetStore()
    setOriginalTitle(title)
    setIsTextEdited(false)
    editorRef.current?.resetEditState()
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <ContentEditable
        html={title}
        placeholder="Titel der Seite"
        onChange={(e) => setTitle(e.target.value)}
        tagName="h2"
      />
      <TextEditor
        ref={editorRef}
        defaultValue={html}
        onEditStateChange={(edited) => setIsTextEdited(edited)}
      />
      <Button onClick={handleSave} disabled={!hasChanges || !title}>
        Speichern
      </Button>
    </div>
  )
}

export default PageEditor
