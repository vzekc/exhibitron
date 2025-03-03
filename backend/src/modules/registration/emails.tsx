import React from 'react'
import { makeEmailBody } from '../common/emailUtils.js'
import { Registration } from './registration.entity.js'

export const makeWelcomeEmail = (
  name: string,
  email: string,
  completeProfileUrl: string,
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
      <a href={completeProfileUrl}>Registrierung vervollständigen</a>
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
            href={`https://2025.classic-computing.de/admin/registration/${registration.id}`}>
            Admin-Interface
          </a>{' '}
          eingesehen und bestätigt werden.
        </p>
      </article>,
    ),
    attachments: [
      {
        filename: `registration-${registration.exhibition.key}-${registration.id}.json`,
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

export const makePasswordResetEmail = (email: string, resetUrl: string) => ({
  to: [email],
  subject: 'Passwort zurücksetzen',
  body: makeEmailBody(
    <article>
      <h1>Passwort zurücksetzen</h1>
      <p>
        Du (oder jemand anderes) hast um ein Zurücksetzen des Passworts gebeten.
        Wenn das nicht stimmt, ignoriere diese E-Mail einfach. Klicke auf den
        folgenden Link, um ein neues Passwort zu setzen:
      </p>
      <a href={resetUrl}>Passwort zurücksetzen</a>
    </article>,
  ),
})
