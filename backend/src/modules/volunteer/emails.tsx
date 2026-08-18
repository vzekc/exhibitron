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
  </li>
)

export const makeVerificationEmail = (
  name: string,
  email: string,
  confirmUrl: string,
  forumUrl: string,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject: `Bitte bestätige deine Anmeldung als Helfer bei der ${exhibitionTitle}`,
  body: makeEmailBody(
    <article>
      <h1>Hallo {name}!</h1>
      <p>
        Du möchtest bei der {exhibitionTitle} mithelfen. Bevor du dich für Schichten eintragen
        kannst, brauchen wir einmal die Bestätigung, dass diese Adresse dir gehört. Danach führt
        dieser Link jederzeit zu deinen Schichten.
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
        Unter <a href={shiftsUrl}>Mitmachen</a> stehen alle deine Schichten, und dort kannst du auch
        wieder absagen, wenn etwas dazwischenkommt.
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

export const makeDigestEmail = (
  name: string,
  email: string,
  bookings: VolunteerBooking[],
  shiftsUrl: string,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject: `Deine Schichten morgen bei der ${exhibitionTitle}`,
  body: makeEmailBody(
    <article>
      <h1>Hallo {name}!</h1>
      <p>Morgen hilfst du hier mit:</p>
      <ul>
        {bookings.map((booking) => (
          <Shift key={booking.id} booking={booking} />
        ))}
      </ul>
      {bookings[0]?.period.activity.contact && (
        <p>
          Wenn etwas dazwischenkommt, sag bitte {bookings[0].period.activity.contact.user.fullName}{' '}
          Bescheid.
        </p>
      )}
      {shiftsUrl && (
        <p>
          <a href={shiftsUrl}>Meine Schichten</a>
        </p>
      )}
    </article>,
  ),
})

export const makeReminderEmail = (
  name: string,
  email: string,
  booking: VolunteerBooking,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject: `In einer Stunde: ${booking.period.activity.name}`,
  body: makeEmailBody(
    <article>
      <h1>Gleich geht es los, {name}</h1>
      <ul>
        <Shift booking={booking} />
      </ul>
      <p>Danke, dass du bei der {exhibitionTitle} mithilfst!</p>
    </article>,
  ),
})
