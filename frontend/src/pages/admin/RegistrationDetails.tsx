import { formatValue } from './utils.ts'
import { useEffect, useState } from 'react'
import * as backend from '../../api/index'
import { client as backendClient } from '../../api/client.gen'
import { Registration } from './RegistrationList.tsx'
import useMandatoryParams from '../../utils/useMandatoryParams.ts'
import { useNavigate } from 'react-router-dom'

backendClient.setConfig({
  baseURL: '/api',
})

const RegistrationDetails = () => {
  const { id } = useMandatoryParams<{ id: string }>()
  const [registration, setRegistration] = useState<Registration | undefined>()
  const [notes, setNotes] = useState(registration?.notes || '')
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

  const handleApprove = async () => {
    if (confirm('Anmeldung bestätigen?')) {
      await backend.putRegistrationByEventIdByRegistrationIdApprove({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      const updated = await backend.getRegistrationByEventIdByRegistrationId({
        path: {
          eventId: 'cc2025',
          registrationId: +id,
        },
      })
      setRegistration(updated.data)
    }
  }

  const handleReject = async () => {
    if (confirm('Anmeldung ablehnen?')) {
      await backend.putRegistrationByEventIdByRegistrationIdReject({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      const updated = await backend.getRegistrationByEventIdByRegistrationId({
        path: {
          eventId: 'cc2025',
          registrationId: +id,
        },
      })
      setRegistration(updated.data)
    }
  }

  const handleDelete = async () => {
    if (confirm('Anmeldung löschen?')) {
      await backend.deleteRegistrationByEventIdByRegistrationId({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      navigate('/admin/registrations')
    }
  }

  const formatted = (key: keyof typeof registration) =>
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
                  <button type="button" onClick={handleApprove}>
                    Annehmen
                  </button>
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
              <button type="button">Speichern</button>
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
      </article>
    )
  )
}

export default RegistrationDetails
