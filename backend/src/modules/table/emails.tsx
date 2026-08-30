import React from 'react'
import { makeEmailBody } from '../common/emailUtils.js'

/*
 * What one exhibitor is told about a day of table movement: who moved tables,
 * which of theirs went and which came, and what they hold now that it is over.
 * The numbers are the net result of the day — a table that came and went again
 * appears in neither list.
 */
export type TableChangeDigest = {
  actors: string[]
  released: number[]
  assigned: number[]
  holding: number[]
}

/* "9", "9 und 10", "9, 10 und 11". */
export const listOf = (items: (string | number)[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`

const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const actorsLine = (actors: string[]) =>
  capitalised(
    `${listOf(actors)} ${actors.length === 1 ? 'hat' : 'haben'} die Tischbelegung geändert:`,
  )

export const releasedLine = (tables: number[]) =>
  tables.length === 1
    ? `Tisch ${tables[0]} wurde freigegeben.`
    : `Tische ${listOf(tables)} wurden freigegeben.`

export const assignedLine = (tables: number[]) =>
  tables.length === 1
    ? `Tisch ${tables[0]} wurde Dir zugewiesen.`
    : `Tische ${listOf(tables)} wurden Dir zugewiesen.`

export const holdingLine = (tables: number[]) => {
  if (tables.length === 0) return 'Du hast jetzt keinen Tisch mehr.'
  if (tables.length === 1) return `Du hast jetzt den Tisch ${tables[0]}.`
  return `Du hast jetzt die Tische ${listOf(tables)}.`
}

export const makeTableChangeDigestEmail = (
  name: string,
  email: string,
  digest: TableChangeDigest,
  tablesUrl: string,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject:
    digest.released.length + digest.assigned.length === 1
      ? `Dein Tisch auf der ${exhibitionTitle} hat sich geändert`
      : `Deine Tische auf der ${exhibitionTitle} haben sich geändert`,
  body: makeEmailBody(
    <article>
      <h1>Hallo {name}!</h1>
      <p>{actorsLine(digest.actors)}</p>
      <ul>
        {digest.released.length > 0 && <li>{releasedLine(digest.released)}</li>}
        {digest.assigned.length > 0 && <li>{assignedLine(digest.assigned)}</li>}
      </ul>
      <p>{holdingLine(digest.holding)}</p>
      {tablesUrl && (
        <p>
          <a href={tablesUrl}>Zum Sitzplan</a>
        </p>
      )}
      <p>Wenn das nicht stimmt, wende Dich an die Organisation.</p>
    </article>,
  ),
})
