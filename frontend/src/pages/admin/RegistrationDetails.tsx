import { formatValue } from './utils.ts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Confirm from '../../components/Confirm'
import MessageInputModal from '../../components/MessageInputModal'
import './RegistrationDetails.css'
import { useBreadcrumb } from '../../contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import useMandatoryParams from '../../utils/useMandatoryParams.ts'

type ConfirmAction = {
  title: string
  message: string
  actionName: string
  action: () => void
}

const GET_REGISTRATION = graphql(`
  query GetRegistration($id: Int!) {
    getRegistration(id: $id) {
      id
      createdAt
      updatedAt
      status
      name
      email
      nickname
      topic
      message
      notes
      data
    }
  }
`)

const APPROVE_REGISTRATION = graphql(`
  mutation ApproveRegistration($id: Int!, $siteUrl: String!, $message: String) {
    approveRegistration(id: $id, siteUrl: $siteUrl, message: $message)
  }
`)

const REJECT_REGISTRATION = graphql(`
  mutation RejectRegistration($id: Int!) {
    rejectRegistration(id: $id)
  }
`)

const DELETE_REGISTRATION = graphql(`
  mutation DeleteRegistration($id: Int!) {
    deleteRegistration(id: $id)
  }
`)

const SET_REGISTRATION_IN_PROGRESS = graphql(`
  mutation SetRegistrationInProgress($id: Int!) {
    setRegistrationInProgress(id: $id)
  }
`)

const UPDATE_REGISTRATION_NOTES = graphql(`
  mutation UpdateRegistrationNotes($id: Int!, $notes: String!) {
    updateRegistrationNotes(id: $id, notes: $notes) {
      id
      notes
    }
  }
`)

const RegistrationDetails = () => {
  const { id } = useMandatoryParams<{ id: string }>()
  const { data, refetch } = useQuery(GET_REGISTRATION, {
    variables: { id: parseInt(id) },
  })
  const [approveRegistration] = useMutation(APPROVE_REGISTRATION)
  const [rejectRegistration] = useMutation(REJECT_REGISTRATION)
  const [deleteRegistration] = useMutation(DELETE_REGISTRATION)
  const [setRegistrationInProgress] = useMutation(SET_REGISTRATION_IN_PROGRESS)
  const [updateNotes] = useMutation(UPDATE_REGISTRATION_NOTES)
  const [notes, setNotes] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const apolloClient = useApolloClient()

  useEffect(() => {
    if (data?.getRegistration) {
      setNotes(data.getRegistration.notes || '')
      setDetailName(location.pathname, data.getRegistration.name || '')
    }
  }, [data, setDetailName])

  if (!data?.getRegistration) {
    return <div>Laden...</div>
  }

  const handleStatusChange = async (status: string) => {
    switch (status) {
      case 'approved':
        setMessageModalOpen(true)
        break
      case 'rejected':
        await rejectRegistration({ variables: { id: parseInt(id) } })
        break
      case 'inProgress':
        await setRegistrationInProgress({ variables: { id: parseInt(id) } })
        break
    }
    await refetch()
  }

  const handleApprove = async (message: string) => {
    await approveRegistration({
      variables: {
        id: parseInt(id),
        siteUrl: window.location.origin,
        message: message || undefined,
      },
    })
    setMessageModalOpen(false)
    await refetch()
  }

  const handleSaveNotes = async () => {
    await updateNotes({ variables: { id: parseInt(id), notes } })
    await refetch()
  }

  const handleConfirmAction = async () => {
    if (confirmAction) {
      confirmAction.action()
      setConfirmAction(null)
    }
  }

  const registration = data.getRegistration

  return (
    <article>
      <h1>Anmeldung bearbeiten</h1>
      <form onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <label>
            Name:
            <p>{registration.name}</p>
          </label>
          <label>
            Email:
            <p>
              <a href={`mailto:${registration.email}`}>{registration.email}</a>
            </p>
          </label>
          {registration.nickname && (
            <label>
              Nickname:
              <p>{registration.nickname}</p>
            </label>
          )}
          <label>
            Thema:
            <p>{registration.topic}</p>
          </label>
          {registration.message && (
            <label>
              Nachricht:
              <p>{registration.message}</p>
            </label>
          )}
          <div className="grid">
            <label>Eingegangen: {formatValue('createdAt', registration.createdAt as string)}</label>
            {registration.updatedAt ? (
              <label>Geändert: {formatValue('updatedAt', registration.updatedAt as string)}</label>
            ) : undefined}
          </div>
          <label>
            Status:
            <div className="grid">
              <input type="text" value={formatValue('status', registration.status)} readOnly />
              {registration.status !== 'approved' && (
                <>
                  {registration.status !== 'inProgress' && (
                    <button type="button" onClick={() => handleStatusChange('inProgress')}>
                      In Bearbeitung
                    </button>
                  )}
                  <button type="button" onClick={() => handleStatusChange('approved')}>
                    Annehmen
                  </button>
                </>
              )}
              {registration.status !== 'rejected' && (
                <button type="button" onClick={() => handleStatusChange('rejected')}>
                  Ablehnen
                </button>
              )}
              {registration.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      title: 'Anmeldung löschen',
                      message:
                        'Anmeldung löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
                      actionName: 'Löschen',
                      action: async () => {
                        await deleteRegistration({
                          variables: { id: parseInt(id) },
                        })
                        await apolloClient.clearStore()
                        navigate('/admin/registration')
                      },
                    })
                  }>
                  Löschen
                </button>
              )}
            </div>
          </label>
          <label>
            Notizen:
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {notes !== (registration.notes || '') && (
            <button type="button" onClick={handleSaveNotes}>
              Speichern
            </button>
          )}
        </fieldset>
        <h2>Zusätzliche Daten</h2>
        <table>
          <tbody>
            {Object.entries(registration.data || {})
              .filter(([, v]) => !!v)
              .map(([key, value]) => (
                <tr key={key}>
                  <th>{key}</th>
                  <td>{formatValue(key, value as string | number | boolean)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </form>
      {confirmAction && (
        <Confirm
          title={confirmAction.title}
          message={confirmAction.message}
          confirm={confirmAction.actionName}
          cancel="Abbrechen"
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmAction(null)}
          isOpen={!!confirmAction}
        />
      )}
      <MessageInputModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        onSubmit={handleApprove}
        title="Anmeldung bestätigen"
        submitLabel="Bestätigen und Email senden"
      />
    </article>
  )
}

export default RegistrationDetails
