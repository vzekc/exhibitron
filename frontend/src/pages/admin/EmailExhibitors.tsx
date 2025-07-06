import { useState, useRef } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import TextEditor, { TextEditorHandle } from '@components/TextEditor.tsx'
import Button from '@components/Button.tsx'
import { FormFieldGroup, FormLabel, Input, Checkbox } from '@components/Form.tsx'
import ActionBar from '@components/ActionBar.tsx'
import MultipleExhibitorSelector from '@components/MultipleExhibitorSelector.tsx'
import Modal from '@components/Modal.tsx'
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
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const editorRef = useRef<TextEditorHandle>(null)
  const { data } = useQuery(GET_EXHIBITORS)

  const handleSendClick = () => {
    setShowConfirmModal(true)
    setIsSending(false)
    setEmailSent(false)
  }

  const handleConfirmSend = async () => {
    setIsSending(true)
    const currentHtml = editorRef.current?.getHTML() || ''

    try {
      await emailExhibitors({
        variables: { exhibitorIds: selectedExhibitorIds.map(Number), subject, html: currentHtml },
      })
      setEmailSent(true)
    } catch (error) {
      console.error('Error sending email:', error)
      setEmailSent(false)
    } finally {
      setIsSending(false)
    }
  }

  const handleCloseModal = () => {
    setShowConfirmModal(false)
    if (emailSent) {
      setSubject('')
      setSelectedExhibitorIds([])
      setSendToAllExhibitors(false)
      editorRef.current?.clear()
      setEdited(false)
    }
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
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Betreff der E-Mail"
        />
        <FormLabel>Nachricht</FormLabel>
        <TextEditor ref={editorRef} onEditStateChange={(e) => setEdited(e)} />
      </FormFieldGroup>
      <ActionBar>
        <Button type="button" onClick={handleSendClick} disabled={!canSend()}>
          Senden
        </Button>
      </ActionBar>

      <Modal isOpen={showConfirmModal} onClose={handleCloseModal} title="E-Mail senden">
        {!isSending && !emailSent && (
          <div className="space-y-4">
            <p>Möchtest Du die Email senden?</p>
            <div className="flex justify-end space-x-2">
              <Button type="button" onClick={handleCloseModal}>
                Abbrechen
              </Button>
              <Button type="button" onClick={handleConfirmSend}>
                Senden
              </Button>
            </div>
          </div>
        )}

        {isSending && (
          <div className="flex min-h-[100px] items-center justify-center">
            <p>Die Email wird gesendet</p>
            <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
          </div>
        )}

        {emailSent && (
          <div className="space-y-4">
            <p className="text-green-600">E-Mail gesendet</p>
            <div className="flex justify-end">
              <Button type="button" onClick={handleCloseModal}>
                Schließen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default EmailExhibitors
