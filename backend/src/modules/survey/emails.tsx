import React from 'react'
import { makeEmailBody } from '../common/emailUtils.js'

export type DigestRow = {
  exhibitorName: string
  questionLabel: string
  answer: string
}

/*
 * The day's changed answers, for the admins of one exhibition. One row per
 * answer, grouped by question in the order the questions are asked.
 */
export const makeSurveyDigestEmail = (
  to: string[],
  rows: DigestRow[],
  resultsUrl: string,
  exhibitionTitle: string,
) => {
  const byQuestion = new Map<string, DigestRow[]>()
  for (const row of rows) {
    byQuestion.set(row.questionLabel, [...(byQuestion.get(row.questionLabel) ?? []), row])
  }
  return {
    to,
    subject: `${exhibitionTitle}: ${rows.length} neue oder geänderte Antworten der Aussteller`,
    body: makeEmailBody(
      <article>
        <h1>Hallo</h1>
        <p>
          Seit der letzten Übersicht haben Aussteller der {exhibitionTitle} Fragen neu oder anders
          beantwortet:
        </p>
        {[...byQuestion].map(([label, theirs]) => (
          <section key={label}>
            <h2>{label}</h2>
            <ul>
              {theirs.map((row, index) => (
                <li key={index}>
                  {row.exhibitorName}: {row.answer}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {resultsUrl && (
          <p>
            Alle Antworten stehen unter <a href={resultsUrl}>{resultsUrl}</a>.
          </p>
        )}
      </article>,
    ),
  }
}
