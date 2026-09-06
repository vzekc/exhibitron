import { useState, useRef } from 'react'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client'
import TextEditor, { TextEditorHandle } from '@components/TextEditor.tsx'
import Button from '@components/Button.tsx'
import { FormFieldGroup, FormLabel, Input } from '@components/Form.tsx'
import ActionBar from '@components/ActionBar.tsx'
import MultipleExhibitorSelector from '@components/MultipleExhibitorSelector.tsx'
import Modal from '@components/Modal.tsx'
import { showMessage } from '@components/MessageModalUtil.tsx'
import { graphql } from 'gql.tada'
import FormSelect from '@components/FormSelect.tsx'
import { audienceLabel, Audience } from '@components/survey/answers'

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

/* The exhibitors a question with this audience is put to. */
const GET_AUDIENCE_MEMBERS = graphql(`
  query GetSurveyAudienceMembers($audience: SurveyAudience!) {
    getSurveyAudienceMembers(audience: $audience) {
      id
    }
  }
`)

const EmailExhibitors = () => {
  const [emailExhibitors] = useMutation(EMAIL_EXHIBITORS)
  const [subject, setSubject] = useState('')
  /* Who gets the mail: everybody, one audience of the survey, or chosen exhibitors. */
  type Recipients = 'all' | 'audience' | 'exhibitor'
  const [recipients, setRecipients] = useState<Recipients>('all')
  const [audience, setAudience] = useState<Audience>('fotofix')
  const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([])
  const [edited, setEdited] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const editorRef = useRef<TextEditorHandle>(null)
  const { data } = useQuery(GET_EXHIBITORS)
  const [fetchAudience] = useLazyQuery(GET_AUDIENCE_MEMBERS)

  /* The ids the backend gets; an empty list means every exhibitor. */
  const recipientIds = async () => {
    switch (recipients) {
      case 'all':
        return []
      case 'audience': {
        const result = await fetchAudience({ variables: { audience } })
        return (result.data?.getSurveyAudienceMembers ?? []).map((each) => each.id)
      }
      case 'exhibitor':
        return selectedExhibitorIds.map(Number)
    }
  }

  const handleSendClick = () => {
    setShowConfirmModal(true)
    setIsSending(false)
    setEmailSent(false)
  }

  const handleConfirmSend = async () => {
    setIsSending(true)
    const currentHtml = editorRef.current?.getHTML() || ''

    const exhibitorIds = await recipientIds()
    if (recipients === 'audience' && !exhibitorIds.length) {
      setIsSending(false)
      setShowConfirmModal(false)
      await showMessage(
        'Niemand zu erreichen',
        'Diese Zielgruppe hat zurzeit keine Mitglieder.',
        'OK',
      )
      return
    }
    const result = await emailExhibitors({
      variables: { exhibitorIds, subject, html: currentHtml },
    })
    setIsSending(false)
    if (result.errors?.length) {
      setShowConfirmModal(false)
      await showMessage(
        'Fehler',
        result.errors[0]?.message || 'Die E-Mail konnte nicht gesendet werden.',
        'OK',
      )
      return
    }
    setEmailSent(true)
  }

  const handleCloseModal = () => {
    setShowConfirmModal(false)
    if (emailSent) {
      setSubject('')
      setSelectedExhibitorIds([])
      setRecipients('all')
      editorRef.current?.clear()
      setEdited(false)
    }
  }

  const messageEntered = () => {
    const text = editorRef.current?.getHTML()
    return edited && text && text.replaceAll(/<\/?(p|br|div)>/g, '').trim().length > 0
  }

  const canSend = () =>
    subject && messageEntered() && (recipients !== 'exhibitor' || selectedExhibitorIds.length > 0)

  return (
    <div>
      <FormFieldGroup>
        <FormLabel>Empfänger</FormLabel>
        <div className="space-y-2">
          {(
            [
              ['all', 'Alle Aussteller'],
              ['audience', 'Eine Zielgruppe'],
              ['exhibitor', 'Ein Aussteller'],
            ] as [Recipients, string][]
          ).map(([mode, label]) => (
            <label key={mode} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="recipients"
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                checked={recipients === mode}
                onChange={() => setRecipients(mode)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {recipients === 'audience' && (
          <div className="ml-6 mt-2">
            <FormSelect value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {(Object.keys(audienceLabel) as Audience[]).map((each) => (
                <option key={each} value={each}>
                  {audienceLabel[each]}
                </option>
              ))}
            </FormSelect>
          </div>
        )}
        {recipients === 'exhibitor' && (
          <div className="ml-6 mt-2">
            <MultipleExhibitorSelector
              exhibitors={data?.getCurrentExhibition?.exhibitors || []}
              selectedIds={selectedExhibitorIds}
              onChange={setSelectedExhibitorIds}
            />
          </div>
        )}
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
