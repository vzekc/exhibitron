import React from 'react'
import { makeEmailBody } from '../common/emailUtils.js'
import { Registration } from './entity.js'

export const makeWelcomeEmail = (
  name: string,
  email: string,
  completeProfileUrl: string,
  exhibitionTitle: string,
  message?: string | null,
) => ({
  to: [email],
  subject: `Willkommen als Aussteller auf der ${exhibitionTitle}!`,
  body: makeEmailBody(
    <article>
      <h1>Willkommen, {name}!</h1>
      <p>
        Deine Anmeldung als Aussteller auf der {exhibitionTitle} war erfolgreich. Bitte
        vervollständige deine Registrierung, um deine Anmeldung abzuschließen.
      </p>
      {message && <p>{message}</p>}
      <a href={completeProfileUrl}>Registrierung vervollständigen</a>
    </article>,
  ),
})

export const makeNewRegistrationEmail = (
  to: string[],
  registration: Registration,
  siteUrl: string,
) => {
  const name =
    registration.data?.forum === 'forum.classic-computing.de' && registration.nickname
      ? `@${registration.nickname}`
      : registration.name
  const exhibitionTitle = registration.exhibition.title
  return {
    to,
    subject: `Neue Anmeldung zur ${exhibitionTitle} von ${name}`,
    body: makeEmailBody(
      <article>
        <h1>Hallo</h1>
        <p>
          Eine neue Anmeldung zur {exhibitionTitle} von{' '}
          <a href={`mailto:${registration.email}`}>{name}</a> ist eingegangen. Die Anmeldung wurde
          in der Datenbank gespeichert und kann über das{' '}
          <a href={`${siteUrl}/admin/registration/${registration.id}`}>Admin-Interface</a>{' '}
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

export const makeNewRegistrationReceivedEmail = (email: string, exhibitionTitle: string) => ({
  to: [email],
  subject: `Deine Anmeldung zur ${exhibitionTitle} ist eingegangen`,
  body: makeEmailBody(
    <article>
      <h1>Vielen Dank für deine Anmeldung zur {exhibitionTitle}!</h1>
      <p>Wir haben Deine Anmeldung empfangen und melden uns in den nächsten Tagen bei Dir.</p>
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
        Du (oder jemand anderes) hast um ein Zurücksetzen des Passworts gebeten. Wenn das nicht
        stimmt, ignoriere diese E-Mail einfach. Klicke auf den folgenden Link, um ein neues Passwort
        zu setzen:
      </p>
      <a href={resetUrl}>Passwort zurücksetzen</a>
    </article>,
  ),
})

export const makeVisitorContactEmail = (email: string, subject: string, message: string) => ({
  to: [email],
  subject,
  body: makeEmailBody(
    <article>
      <h1>{subject}</h1>
      <p>Du hast eine Nachricht von einem Besucher erhalten. Hier ist die Nachricht:</p>
      <pre>{message}</pre>
    </article>,
  ),
})
