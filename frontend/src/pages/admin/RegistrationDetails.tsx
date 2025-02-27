import { formatValue } from './utils.ts'
import { useEffect, useState } from 'react'
import * as backend from '../../api/index'
import { client as backendClient } from '../../api/client.gen'
import { Registration } from './RegistrationList.tsx'
import useMandatoryParams from '../../utils/useMandatoryParams.ts'
import { useNavigate } from 'react-router-dom'
import Confirm from '../../components/Confirm'
import './RegistrationDetails.css'

backendClient.setConfig({
  baseURL: '/api',
})

type ConfirmAction = {
  title: string
  message: string
  actionName: string
  action: () => void
}

const RegistrationDetails = () => {
  const { id } = useMandatoryParams<{ id: string }>()
  const [registration, setRegistration] = useState<Registration | undefined>()
  const [notes, setNotes] = useState(registration?.notes || '')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await backend.getRegistrationByEventIdByRegistrationId({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      setRegistration(data)
      setNotes(data?.notes || '')
    }
    void fetchData()
  }, [id])

  if (!registration) {
    return <div>Laden...</div>
  }

  const reload = async () => {
    const updated = await backend.getRegistrationByEventIdByRegistrationId({
      path: {
        eventId: 'cc2025',
        registrationId: +id,
      },
    })
    setRegistration(updated.data)
  }

  const handleInProgress = async () => {
    await backend.putRegistrationByEventIdByRegistrationIdInProgress({
      path: {
        eventId: 'cc2025',
        registrationId: +id,
      },
    })
    await reload()
  }

  const handleApprove = () =>
    setConfirmAction({
      title: 'Anmeldung annehmen',
      message: 'Anmeldung annehmen und E-Mail an Aussteller verschicken?',
      actionName: 'Annehmen',
      action: async () => {
        await backend.putRegistrationByEventIdByRegistrationIdApprove({
          path: { eventId: 'cc2025', registrationId: +id },
        })
        await reload()
      },
    })

  const handleReject = () =>
    setConfirmAction({
      title: 'Anmeldung ablehnen',
      message:
        'Anmeldung ablehnen?  Bitte dann noch eine E-Mail an den Aussteller schicken.',
      actionName: 'Ablehnen',
      action: async () => {
        await backend.putRegistrationByEventIdByRegistrationIdReject({
          path: { eventId: 'cc2025', registrationId: +id },
        })
        await reload()
      },
    })

  const handleDelete = () =>
    setConfirmAction({
      title: 'Anmeldung löschen',
      message:
        'Anmeldung löschen?  Diese Aktion kann nicht rückgängig gemacht werden.',
      actionName: 'Löschen',
      action: async () => {
        await backend.deleteRegistrationByEventIdByRegistrationId({
          path: { eventId: 'cc2025', registrationId: +id },
        })
        navigate('/admin/registrations')
      },
    })

  const handleSaveNotes = async () => {
    await backend.patchRegistrationByEventIdByRegistrationId({
      path: { eventId: 'cc2025', registrationId: +id },
      body: { notes },
    })
    setRegistration({ ...registration, notes })
  }

  const formatted = (key: keyof Registration) =>
    formatValue(key, registration[key] as string | number | boolean)

  return (
    registration && (
      <article>
        <h1>Anmeldung bearbeiten</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <label>
              Status:
              <div className="grid">
                <input type="text" value={formatted('status')} readOnly />
                {registration.status !== 'approved' && (
                  <>
                    <button type="button" onClick={handleApprove}>
                      Annehmen
                    </button>
                    {registration.status !== 'inProgress' && (
                      <button type="button" onClick={handleInProgress}>
                        In Bearbeitung
                      </button>
                    )}
                  </>
                )}
                {registration.status !== 'rejected' && (
                  <button type="button" onClick={handleReject}>
                    Ablehnen
                  </button>
                )}
                {registration.status !== 'approved' && (
                  <button type="button" onClick={handleDelete}>
                    Löschen
                  </button>
                )}
              </div>
            </label>
            <label>
              Notizen:
              <textarea
                defaultValue={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {notes !== registration.notes && (
              <button type="button" onClick={handleSaveNotes}>
                Speichern
              </button>
            )}
            <label>
              Name:
              <p>{registration.name}</p>
            </label>
            <label>
              Email:
              <p>
                <a href={`mailto:${registration.email}`}>
                  {registration.email}
                </a>
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
          </fieldset>
          <table>
            <tbody>
              {Object.entries(registration.data || {})
                .filter(([, v]) => !!v)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>
                      {formatValue(key, value as string | number | boolean)}
                    </td>
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
            onConfirm={() => {
              confirmAction?.action()
              setConfirmAction(null)
            }}
            onClose={() => setConfirmAction(null)}
            isOpen={!!confirmAction}
          />
        )}
      </article>
    )
  )
}

export default RegistrationDetails
