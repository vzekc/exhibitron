import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import './Card.css'

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

const ExhibitorDetails = ({ id }: { id: number }) => {
  const { data } = useQuery(GET_EXHIBITOR, {
    variables: { id },
  })
  const { user } = data?.getExhibitor || {}
  const { fullName, bio, contacts } = user || {}
  const { email, phone, mastodon, website } = contacts || {}

  return (
    <section className="card">
      <h2 className="card-title">Aussteller: {fullName}</h2>
      {bio && <div className="card-content" dangerouslySetInnerHTML={{ __html: bio }} />}
      {contacts && (email || phone || mastodon || website) && (
        <div className="card-content">
          <h3>Kontakt</h3>
          <div className="contact-details">
            {email && (
              <div>
                Email:{' '}
                <a rel="noopener noreferrer" target="_blank" href={`mailto:${email}`}>
                  {email}
                </a>
              </div>
            )}
            {phone && (
              <div>
                Telefon:{' '}
                <a rel="noopener noreferrer" target="_blank" href={`tel:${phone}`}>
                  {phone}
                </a>
              </div>
            )}
            {mastodon && (
              <div>
                Mastodon:{' '}
                <a rel="noopener noreferrer" target="_blank" href={mastodonUrl(mastodon)}>
                  {mastodon}
                </a>
              </div>
            )}
            {website && (
              <div>
                Website:{' '}
                <a rel="noopener noreferrer" target="_blank" href={website}>
                  {website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default ExhibitorDetails
