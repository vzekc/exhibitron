import { useState, useRef } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import TextEditor, { TextEditorHandle } from '@components/TextEditor.tsx'
import Button from '@components/Button.tsx'
import { FormFieldGroup, FormLabel, Input, Checkbox } from '@components/Form.tsx'
import ActionBar from '@components/ActionBar.tsx'
import MultipleExhibitorSelector from '@components/MultipleExhibitorSelector.tsx'
import { graphql } from 'gql.tada'

const EMAIL_EXHIBITORS = graphql(`
  mutation EmailExhibitors($exhibitorIds: [Int!]!, $subject: String!, $html: String!) {
    emailExhibitors(exhibitorIds: $exhibitorIds, subject: $subject, html: $html)
  }
`)

const GET_EXHIBITORS = graphql(`
  query GetExhibitors {
    getCurrentExhibition {
      id
      exhibitors {
        id
        topic
        user {
          id
          fullName
          nickname
          profileImage
        }
      }
    }
  }
`)

const EmailExhibitors = () => {
  const [emailExhibitors] = useMutation(EMAIL_EXHIBITORS)
  const [subject, setSubject] = useState('')
  const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([])
  const [sendToAllExhibitors, setSendToAllExhibitors] = useState(false)
  const [edited, setEdited] = useState(false)
  const editorRef = useRef<TextEditorHandle>(null)
  const { data } = useQuery(GET_EXHIBITORS)

  const handleSend = async () => {
    const currentHtml = editorRef.current?.getHTML() || ''

    await emailExhibitors({
      variables: { exhibitorIds: selectedExhibitorIds.map(Number), subject, html: currentHtml },
    })
  }

  const handleSendToAllChange = (checked: boolean) => {
    setSendToAllExhibitors(checked)
    if (checked) {
      setSelectedExhibitorIds([])
    }
  }

  const handleExhibitorSelectionChange = (ids: string[]) => {
    setSelectedExhibitorIds(ids)
    if (ids.length > 0) {
      setSendToAllExhibitors(false)
    }
  }

  const messageEntered = () => {
    const text = editorRef.current?.getHTML()
    return edited && text && text.replaceAll(/<\/?(p|br|div)>/g, '').trim().length > 0
  }

  const canSend = () =>
    subject && messageEntered() && (sendToAllExhibitors || selectedExhibitorIds.length > 0)

  return (
    <div>
      <FormFieldGroup>
        <FormLabel>Empfänger</FormLabel>
        <Checkbox
          label="Alle Aussteller"
          checked={sendToAllExhibitors}
          onChange={(e) => handleSendToAllChange(e.target.checked)}
          disabled={selectedExhibitorIds.length > 0}
        />
        <MultipleExhibitorSelector
          exhibitors={data?.getCurrentExhibition?.exhibitors || []}
          selectedIds={selectedExhibitorIds}
          onChange={handleExhibitorSelectionChange}
          disabled={sendToAllExhibitors}
        />
        <FormLabel>Betreff</FormLabel>
        <Input onChange={(e) => setSubject(e.target.value)} placeholder="Betreff der E-Mail" />
        <FormLabel>Nachricht</FormLabel>
        <TextEditor ref={editorRef} onEditStateChange={(e) => setEdited(e)} />
      </FormFieldGroup>
      <ActionBar>
        <Button type="button" onClick={handleSend} disabled={!canSend()}>
          Senden
        </Button>
      </ActionBar>
    </div>
  )
}

export default EmailExhibitors
