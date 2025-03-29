type ContactInfoProps = {
  contacts: {
    email?: string | null
    phone?: string | null
    mastodon?: string | null
    website?: string | null
  }
}

const mastodonUrl = (mastodon: string) => {
  const [, username, instance] = mastodon.match(/@([^@]+)@(.*)/) || []
  if (username && instance) {
    return `https://${instance}/@${username}`
  }
}

const ContactInfo = ({ contacts }: ContactInfoProps) => {
  const { email, phone, mastodon, website } = contacts

  if (!email && !phone && !mastodon && !website) return null

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-900">Kontakt</h3>
      <div className="space-y-1 text-sm text-gray-600">
        {email && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Email:</span>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={`mailto:${email}`}
              className="text-blue-600 hover:text-blue-800 hover:underline">
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
              className="text-blue-600 hover:text-blue-800 hover:underline">
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
              className="text-blue-600 hover:text-blue-800 hover:underline">
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
              className="text-blue-600 hover:text-blue-800 hover:underline">
              {website}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactInfo
