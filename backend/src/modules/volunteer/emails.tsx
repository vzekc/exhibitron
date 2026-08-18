import React from 'react'
import { makeEmailBody } from '../common/emailUtils.js'
import { VolunteerBooking } from './entity.js'

const endOf = ({ startTime, durationMinutes }: VolunteerBooking) =>
  new Date(startTime.getTime() + durationMinutes * 60_000)

/* 'Samstag, 13.09., 10:00–13:00 Uhr' */
export const shiftTime = (booking: VolunteerBooking) => {
  const date = booking.startTime.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })
  const from = booking.startTime.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const to = endOf(booking).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${from}–${to} Uhr`
}

const Shift = ({ booking }: { booking: VolunteerBooking }) => (
  <li>
    <strong>{booking.period.activity.name}</strong>, {shiftTime(booking)}
    {booking.period.note && <> — {booking.period.note}</>}
  </li>
)

export const makeVerificationEmail = (
  name: string,
  email: string,
  booking: VolunteerBooking,
  confirmUrl: string,
  forumUrl: string,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject: `Bitte bestätige deine Anmeldung zum Mitmachen bei der ${exhibitionTitle}`,
  body: makeEmailBody(
    <article>
      <h1>Hallo {name}!</h1>
      <p>Du hast dich für diese Schicht eingetragen:</p>
      <ul>
        <Shift booking={booking} />
      </ul>
      <p>
        Damit sie zählt, brauchen wir einmal die Bestätigung, dass diese Adresse dir gehört. Danach
        führt dieser Link jederzeit zu deinen Schichten.
      </p>
      <p>
        <a href={confirmUrl}>Anmeldung bestätigen</a>
      </p>
      <p>
        Wenn du ein Konto im Forum classic-computing.de hast, kannst du es stattdessen damit
        verbinden und dich künftig über das Forum anmelden:
      </p>
      <p>
        <a href={forumUrl}>Mit Forum-Konto verbinden</a>
      </p>
    </article>,
  ),
})

export const makeBookingConfirmedEmail = (
  name: string,
  email: string,
  booking: VolunteerBooking,
  shiftsUrl: string,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject: `Deine Schicht bei der ${exhibitionTitle}: ${booking.period.activity.name}`,
  body: makeEmailBody(
    <article>
      <h1>Danke, {name}!</h1>
      <p>Du bist eingetragen:</p>
      <ul>
        <Shift booking={booking} />
      </ul>
      <p>
        Unter <a href={shiftsUrl}>Meine Schichten</a> stehen alle deine Schichten, und dort kannst
        du auch wieder absagen, wenn etwas dazwischenkommt.
      </p>
    </article>,
  ),
})

export const makeCancellationEmail = (
  contactEmail: string,
  volunteerName: string,
  booking: VolunteerBooking,
  exhibitionTitle: string,
) => ({
  to: [contactEmail],
  subject: `Absage: ${booking.period.activity.name}, ${shiftTime(booking)}`,
  body: makeEmailBody(
    <article>
      <h1>Eine Schicht ist wieder frei</h1>
      <p>
        {volunteerName} hat die Schicht abgesagt, für die {volunteerName} sich bei der{' '}
        {exhibitionTitle} eingetragen hatte:
      </p>
      <ul>
        <Shift booking={booking} />
      </ul>
      <p>Sie beginnt in weniger als 24 Stunden, deshalb diese Nachricht.</p>
    </article>,
  ),
})
