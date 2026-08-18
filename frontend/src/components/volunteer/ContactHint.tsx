export interface ActivityContact {
  fullName: string
  nickname?: string | null
  email?: string | null
  contacts?: { email?: string | null } | null
}

/*
 * Who to ask about an activity. The forum nickname is what people know each
 * other by, so that is what stands there; it links to whichever address the
 * person is reachable at — the one they published for being contacted, or the
 * one their account runs on. The mail arrives with the activity in its subject,
 * so that somebody who looks after several knows which one is meant.
 */
const ContactHint = ({
  contact,
  activityName,
}: {
  contact: ActivityContact
  activityName: string
}) => {
  const address = contact.contacts?.email || contact.email
  const name = contact.nickname ? `@${contact.nickname}` : contact.fullName
  const subject = encodeURIComponent(`Helfer-Anfrage: ${activityName}`)

  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Bei Fragen wende Dich an{' '}
      {address ? (
        <a
          href={`mailto:${address}?subject=${subject}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 dark:text-blue-300">
          {name}
        </a>
      ) : (
        name
      )}
    </p>
  )
}

export default ContactHint
