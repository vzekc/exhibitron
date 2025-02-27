import React from 'react'
import { makeEmailBody } from '../common/sendEmail.js'
import { Registration } from './registration.entity.js'

export const makeWelcomeEmail = (
  name: string,
  email: string,
  registerUrl: string,
) => ({
  to: [email],
  subject: 'Willkommen als Aussteller auf der CC2025!',
  body: makeEmailBody(
    <article>
      <h1>Willkommen, {name}!</h1>
      <p>
        Deine Anmeldung als Aussteller auf der CC2025 war erfolgreich. Bitte
        vervollständige deine Registrierung, um deine Anmeldung abzuschließen.
      </p>
      <a href={registerUrl}>Registrierung vervollständigen</a>
    </article>,
  ),
})

export const makeNewRegistrationEmail = (
  to: string[],
  registration: Registration,
) => {
  const name =
    registration.data?.forum === 'forum.classic-computing.de' &&
    registration.nickname
      ? `@${registration.nickname}`
      : registration.name
  return {
    to,
    subject: `Neue Anmeldung zur CC2025 von ${name}`,
    body: makeEmailBody(
      <article>
        <h1>Hallo</h1>
        <p>
          Eine neue Anmeldung zur CC2025 von{' '}
          <a href={`mailto:${registration.email}`}>{name}</a> ist eingegangen.
          Die Anmeldung wurde in der Datenbank gespeichert und kann über das{' '}
          <a
            href={`https://2025.classic-computing.de/admin/registrations/${registration.id}`}>
            Admin-Interface
          </a>{' '}
          eingesehen und bestätigt werden.
        </p>
      </article>,
    ),
    attachments: [
      {
        filename: `registration-${registration.eventId}-${registration.id}.json`,
        content: JSON.stringify(registration, null, 2),
      },
    ],
  }
}

export const makeNewRegistrationReceivedEmail = (email: string) => ({
  to: [email],
  subject: 'Deine Anmeldung zur CC2025 ist eingegangen',
  body: makeEmailBody(
    <article>
      <h1>Vielen Dank für deine Anmeldung zur CC2025!</h1>
      <p>
        Wir haben Deine Anmeldung empfangen und melden uns in den nächsten Tagen
        bei Dir.
      </p>
    </article>,
  ),
})
