import { FragmentOf, graphql } from 'gql.tada'
import Card from '@components/Card.tsx'
import ContactInfo from './ContactInfo'
import ProfileSection from './ProfileSection'

const EXHIBITOR_FRAGMENT = graphql(`
  fragment ExhibitorDetails on Exhibitor @_unmask {
    id
    topic
    user {
      id
      fullName
      nickname
      bio
      profileImage
      contacts {
        email
        phone
        mastodon
        website
      }
    }
  }
`)

const ExhibitorCard = ({ exhibitor }: { exhibitor: FragmentOf<typeof EXHIBITOR_FRAGMENT> }) => {
  const { topic, user } = exhibitor || {}
  const { id: userId, fullName, nickname, bio, profileImage, contacts } = user || {}

  return (
    <Card className="w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProfileSection
          userId={String(userId)}
          fullName={fullName}
          nickname={nickname}
          profileImage={Boolean(profileImage)}
          topic={topic}
        />

        <div className="flex flex-col gap-4">
          {bio && (
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: bio }}
            />
          )}
          {contacts && <ContactInfo contacts={contacts} />}
        </div>
      </div>
    </Card>
  )
}

ExhibitorCard.fragment = EXHIBITOR_FRAGMENT

export default ExhibitorCard
