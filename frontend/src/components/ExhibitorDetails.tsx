import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import './ExhibitorDetails.css'
import { useEffect } from 'react'

const GET_EXHIBITOR = graphql(`
  query GetExhibitor($id: Int!) {
    getExhibitor(id: $id) {
      id
      user {
        id
        fullName
        bio
        contacts {
          email
          phone
          mastodon
          website
        }
      }
    }
  }
`)

const mastodonUrl = (mastodon: string) => {
  const [, username, instance] = mastodon.match(/@([^@]+)@(.*)/) || []
  if (username && instance) {
    return `https://${instance}/@${username}`
  }
}

const ExhibitorDetails = ({
  id,
  onLoaded,
}: {
  id: number
  onLoaded?: (exhibitor: { fullName: string }) => void
}) => {
  const { data } = useQuery(GET_EXHIBITOR, {
    variables: { id },
  })
  const { user } = data?.getExhibitor || {}
  const { fullName, bio, contacts } = user || {}
  const { email, phone, mastodon, website } = contacts || {}

  useEffect(() => {
    if (onLoaded && fullName) {
      onLoaded({ fullName })
    }
  }, [onLoaded, fullName])

  return (
    <section className="exhibitor-details">
      <h2>Aussteller: {fullName}</h2>
      {bio && <div dangerouslySetInnerHTML={{ __html: bio }} />}
      {contacts && (email || phone || mastodon || website) && (
        <>
          <h3>Kontakt</h3>
          {email && (
            <label>
              Email: <a href={`mailto:${email}`}>{email}</a>
            </label>
          )}
          {phone && (
            <label>
              Telefon: <a href={`tel:${phone}`}>{phone}</a>
            </label>
          )}
          {mastodon && (
            <label>
              Mastodon: <a href={mastodonUrl(mastodon)}>{mastodon}</a>
            </label>
          )}
          {website && (
            <label>
              Website: <a href={website}>{website}</a>
            </label>
          )}
        </>
      )}
    </section>
  )
}

export default ExhibitorDetails
