type ContactInfoProps = {
  contacts: {
    email?: string | null
    phone?: string | null
    mastodon?: string | null
    website?: string | null
    youtube?: string | null
  }
}

const mastodonUrl = (mastodon: string | null | undefined) => {
  if (!mastodon) return ''
  const [, username, instance] = mastodon.match(/@([^@]+)@(.*)/) || []
  if (username && instance) {
    return `https://${instance}/@${username}`
  }
  return mastodon // Fallback to original URL if parsing fails
}

type ContactLinkProps = {
  label: string
  href: string
  children: React.ReactNode
  value?: string | null
}

const ContactLink = ({ label, href, children, value }: ContactLinkProps) => {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">{label}:</span>
      <a
        rel="noopener noreferrer"
        target="_blank"
        href={href}
        className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
        {children}
      </a>
    </div>
  )
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
        <ContactLink label="Email" href={`mailto:${email}`} value={email}>
          {email}
        </ContactLink>
        <ContactLink label="Telefon" href={`tel:${phone}`} value={phone}>
          {phone}
        </ContactLink>
        <ContactLink label="Mastodon" href={mastodonUrl(mastodon)} value={mastodon}>
          {mastodon}
        </ContactLink>
        <ContactLink label="Website" href={`${website}`} value={website}>
          {website}
        </ContactLink>
        <ContactLink label="YouTube" href={`${youtube}`} value={youtube}>
          {youtube?.replace(/.*\//, '')}
        </ContactLink>
      </div>
    </div>
  )
}

export default ContactInfo
