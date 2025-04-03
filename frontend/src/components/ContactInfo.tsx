type ContactInfoProps = {
  contacts: {
    email?: string | null
    phone?: string | null
    mastodon?: string | null
    website?: string | null
    youtube?: string | null
  }
}

const mastodonUrl = (mastodon: string) => {
  const [, username, instance] = mastodon.match(/@([^@]+)@(.*)/) || []
  if (username && instance) {
    return `https://${instance}/@${username}`
  }
}

const ContactInfo = ({ contacts }: ContactInfoProps) => {
  const { email, phone, mastodon, website, youtube } = contacts

  if (!email && !phone && !mastodon && !website && !youtube) return null

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        Kontaktinformationen
      </h3>
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        {email && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Email:</span>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={`mailto:${email}`}
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
              {email}
            </a>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Telefon:</span>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={`tel:${phone}`}
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
              {phone}
            </a>
          </div>
        )}
        {mastodon && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Mastodon:</span>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={mastodonUrl(mastodon)}
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
              {mastodon}
            </a>
          </div>
        )}
        {website && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Website:</span>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={website}
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
              {website}
            </a>
          </div>
        )}
        {youtube && (
          <div className="flex items-center gap-2">
            <span className="font-medium">YouTube:</span>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={youtube}
              className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
              {youtube.replace(/.*\//, '')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactInfo
