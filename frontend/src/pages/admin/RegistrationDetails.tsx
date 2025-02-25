import { formatValue } from './utils.ts'
import { useEffect, useState } from 'react'
import * as backend from '../../api/index'
import { client as backendClient } from '../../api/client.gen'
import { Registration } from './RegistrationList.tsx'
import useMandatoryParams from '../../utils/useMandatoryParams.ts'

backendClient.setConfig({
  baseURL: '/api',
})

const RegistrationDetails = () => {
  const { id } = useMandatoryParams<{ id: string }>()
  const [registration, setRegistration] = useState<Registration | undefined>()
  const [notes, setNotes] = useState(registration?.notes || '')

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await backend.getRegistrationByEventIdByRegistrationId({
        path: { eventId: 'cc2025', registrationId: +id },
      })
      setRegistration(data)
      setNotes(data?.notes || '')
    }
    fetchData()
  }, [id])

  if (!registration) {
    return <div>Laden...</div>
  }

  const changeStatus = (status: 'approved' | 'rejected') => async () => {
    if (confirm('Status wirklich ändern?')) {
      await backend.patchRegistrationByEventIdByRegistrationId({
        path: { eventId: 'cc2025', registrationId: +id },
        body: { status },
      })
      setRegistration({ ...registration, status })
    }
  }

  const deleteRegistration = async () => {}

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
                  <button type="button" onClick={changeStatus('approved')}>
                    Annehmen
                  </button>
                )}
                {registration.status !== 'rejected' && (
                  <button type="button" onClick={changeStatus('rejected')}>
                    Ablehnen
                  </button>
                )}
                {registration.status !== 'approved' && (
                  <button type="button" onClick={deleteRegistration}>
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
