import { formatValue } from './utils.ts'
import { useEffect, useState } from 'react'
import * as backend from '../../api/index'
import { client as backendClient } from '../../api/client.gen'
import { Registration } from './RegistrationList.tsx'
import useMandatoryParams from '../../utils/useMandatoryParams.ts'
import { useNavigate } from 'react-router-dom'
import Confirm from '../../components/Confirm'

backendClient.setConfig({
  baseURL: '/api',
})

const RegistrationDetails = () => {
  const { id } = useMandatoryParams<{ id: string }>()
  const [registration, setRegistration] = useState<Registration | undefined>()
  const [notes, setNotes] = useState(registration?.notes || '')
  const [confirmAction, setConfirmAction] = useState<null | (() => void)>(null)
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
    setConfirmAction(async () => {
      await backend.putRegistrationByEventIdByRegistrationIdApprove({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      await reload()
    })

  const handleReject = () =>
    setConfirmAction(async () => {
      await backend.putRegistrationByEventIdByRegistrationIdReject({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      await reload()
    })

  const handleDelete = () =>
    setConfirmAction(async () => {
      await backend.deleteRegistrationByEventIdByRegistrationId({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      navigate('/admin/registrations')
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
              <input type="text" value={formatted('name')} readOnly />
            </label>
            <label>
              Email:
              <input type="text" value={formatted('email')} readOnly />
            </label>
            <label>
              Nickname:
              <input type="text" value={formatted('nickname')} readOnly />
            </label>
            <label>
              Nachricht:
              <textarea value={formatted('message')} readOnly />
            </label>
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
            title="Confirm Action"
            message="Are you sure you want to proceed with this action?"
            onConfirm={() => {
              confirmAction()
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
