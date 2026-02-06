import React from 'react'
import { makeEmailBody } from '../modules/common/emailUtils.js'

export const makeCleanupNotificationEmail = (
  to: string[],
  exhibitionTitle: string,
  deletedRegistrations: number,
) => ({
  to,
  subject: `Automatische Bereinigung: ${exhibitionTitle}`,
  body: makeEmailBody(
    <article>
      <h1>Automatische Bereinigung abgeschlossen</h1>
      <p>
        Die Ausstellung <strong>{exhibitionTitle}</strong> wurde nach ihrem Ende automatisch
        bereinigt:
      </p>
      <ul>
        <li>Die Registrierungsdaten der {deletedRegistrations} Anmeldung(en) wurden gelöscht</li>
        <li>Die Ausstellung wurde eingefroren, so dass keine Änderungen mehr möglich sind</li>
      </ul>
    </article>,
  ),
})
