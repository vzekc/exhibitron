import React from 'react'
import { makeEmailBody } from '../common/emailUtils.js'
import { TableAssignmentChange } from './entity.js'

/* Whoever made the change, under the name the site shows them by. */
export const actorName = (change: TableAssignmentChange) =>
  change.actor?.fullName || change.actor?.nickname || 'der Organisation'

const exhibitorName = (change: TableAssignmentChange, which: 'previous' | 'new') => {
  const exhibitor = which === 'previous' ? change.previousExhibitor : change.newExhibitor
  return exhibitor?.user.fullName || exhibitor?.user.nickname || 'jemand anderem'
}

/*
 * What one change says to one recipient. The same change reads differently on
 * either side of it: the table arrives for the one and goes for the other.
 */
export const changeLine = (change: TableAssignmentChange, recipientExhibitorId: number) => {
  const by = actorName(change)
  const gained = change.newExhibitor?.id === recipientExhibitorId

  if (gained) {
    return change.previousExhibitor
      ? `Tisch ${change.tableNumber} wurde Dir von ${by} zugewiesen; vorher stand er bei ${exhibitorName(change, 'previous')}.`
      : `Tisch ${change.tableNumber} wurde Dir von ${by} zugewiesen.`
  }
  return change.newExhibitor
    ? `Tisch ${change.tableNumber} wurde von ${by} an ${exhibitorName(change, 'new')} vergeben.`
    : `Tisch ${change.tableNumber} wurde von ${by} freigegeben.`
}

export const makeTableChangeDigestEmail = (
  name: string,
  email: string,
  changes: TableAssignmentChange[],
  recipientExhibitorId: number,
  tablesUrl: string,
  exhibitionTitle: string,
) => ({
  to: [email],
  subject:
    changes.length === 1
      ? `Dein Tisch auf der ${exhibitionTitle} hat sich geändert`
      : `Deine Tische auf der ${exhibitionTitle} haben sich geändert`,
  body: makeEmailBody(
    <article>
      <h1>Hallo {name}!</h1>
      <p>
        {changes.length === 1
          ? 'An Deiner Tischbelegung hat sich etwas geändert:'
          : 'An Deiner Tischbelegung hat sich seit gestern etwas geändert:'}
      </p>
      <ul>
        {changes.map((change) => (
          <li key={change.id}>{changeLine(change, recipientExhibitorId)}</li>
        ))}
      </ul>
      {tablesUrl && (
        <p>
          <a href={tablesUrl}>Zum Sitzplan</a>
        </p>
      )}
      <p>Wenn das nicht stimmt, wende Dich an die Organisation.</p>
    </article>,
  ),
})
