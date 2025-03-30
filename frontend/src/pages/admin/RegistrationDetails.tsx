import { formatValue } from './utils.ts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Confirm from '@components/Confirm'
import MessageInputModal from '@components/MessageInputModal'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import { graphql } from 'gql.tada'
import { useQuery, useMutation, useApolloClient } from '@apollo/client'
import useMandatoryParams from '@utils/useMandatoryParams.ts'
import PageHeading from '../../components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import RegistrationStatusChip from '@components/RegistrationStatusChip.tsx'
import { KeyValueTable, TableRow, TableCell } from '@components/Table'

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
    <article className="space-y-6">
      <header>
        <PageHeading>Anmeldung bearbeiten</PageHeading>
      </header>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        {/* Section 1: Basic Information */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Anmeldeinformationen</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <p className="mt-1 text-base">{registration.name}</p>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <p className="mt-1 text-base">
                <a
                  href={`mailto:${registration.email}`}
                  className="text-blue-600 hover:text-blue-800">
                  {registration.email}
                </a>
              </p>
            </label>
            {registration.nickname && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Nickname</span>
                <p className="mt-1 text-base">{registration.nickname}</p>
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Thema</span>
              <p className="mt-1 text-base">{registration.topic}</p>
            </label>
          </div>

          {registration.message && (
            <label className="mt-4 block">
              <span className="text-sm font-medium text-gray-700">Nachricht</span>
              <p className="mt-1 text-base">{registration.message}</p>
            </label>
          )}
        </section>

        {/* Section 2: Status and Notes */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Status und Notizen</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <RegistrationStatusChip status={registration.status} />
            </div>

            <div className="flex gap-4 text-sm text-gray-600">
              <span>Eingegangen: {formatValue('createdAt', registration.createdAt as string)}</span>
              {!!registration.updatedAt && (
                <span>Geändert: {formatValue('updatedAt', registration.updatedAt as string)}</span>
              )}
            </div>

            <div className="block">
              <span className="text-sm font-medium text-gray-700">Notizen</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-base"
                rows={4}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Additional Data */}
        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Zusätzliche Daten</h2>
          <KeyValueTable headers={['Feld', 'Wert']}>
            {Object.entries(registration.data || {})
              .filter(([, v]) => !!v)
              .map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium text-gray-500">{key}</TableCell>
                  <TableCell>{formatValue(key, value as string | number | boolean)}</TableCell>
                </TableRow>
              ))}
          </KeyValueTable>
        </section>
      </form>

      <ActionBar>
        {registration.status !== 'approved' && (
          <>
            {registration.status !== 'inProgress' && (
              <Button onClick={() => handleStatusChange('inProgress')}>In Bearbeitung</Button>
            )}
            <Button onClick={() => handleStatusChange('approved')}>Annehmen</Button>
          </>
        )}
        {registration.status !== 'rejected' && (
          <Button onClick={() => handleStatusChange('rejected')}>Ablehnen</Button>
        )}
        {registration.status !== 'approved' && (
          <Button
            variant="danger"
            onClick={() =>
              setConfirmAction({
                title: 'Anmeldung löschen',
                message: 'Anmeldung löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
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
          </Button>
        )}
        {notes !== (registration.notes || '') && (
          <Button onClick={handleSaveNotes}>Notizen speichern</Button>
        )}
      </ActionBar>

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
