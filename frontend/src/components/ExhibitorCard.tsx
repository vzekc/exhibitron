import { FragmentOf, graphql } from 'gql.tada'
import Card from '@components/Card.tsx'
import ContactInfo from './ContactInfo'
import ProfileSection from './ProfileSection'
import Button from './Button'
import Modal from './Modal'
import { useState } from 'react'
import { useMutation } from '@apollo/client'

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
      allowEmailContact
      contacts {
        email
        phone
        mastodon
        website
      }
    }
  }
`)

const SEND_VISITOR_EMAIL = graphql(`
  mutation SendVisitorEmail($userId: Int!, $message: String!) {
    sendVisitorEmail(userId: $userId, message: $message)
  }
`)

const ExhibitorCard = ({ exhibitor }: { exhibitor: FragmentOf<typeof EXHIBITOR_FRAGMENT> }) => {
  const { topic, user } = exhibitor || {}
  const {
    id: userId,
    fullName,
    nickname,
    bio,
    profileImage,
    contacts,
    allowEmailContact,
  } = user || {}
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [sendVisitorEmail] = useMutation(SEND_VISITOR_EMAIL)

  const handleSendMessage = async () => {
    if (!userId || !message.trim()) return

    await sendVisitorEmail({
      variables: {
        userId,
        message: message.trim(),
      },
    })
    setIsContactModalOpen(false)
    setShowConfirmation(true)
    setMessage('')
  }

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
          {allowEmailContact && (
            <Button
              onClick={() => setIsContactModalOpen(true)}
              icon="email"
              variant="secondary"
              className="w-fit">
              Direktkontakt
            </Button>
          )}
          {contacts && <ContactInfo contacts={contacts} />}
        </div>
      </div>

      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="Kontakt">
        <div className="space-y-4">
          <p className="text-gray-700">
            Hier kannst Du {nickname || fullName} eine Nachricht senden. Denk daran, Deine eigenen
            Kontakinformationen für eine Antwort hinzuzufügen.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Deine Nachricht..."
            className="w-full rounded-md border border-gray-300 p-2"
            rows={6}
          />
          <div className="flex justify-end">
            <Button onClick={handleSendMessage} disabled={!message.trim()}>
              Nachricht senden
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Nachricht gesendet">
        <div className="space-y-4">
          <p className="text-gray-700">
            Deine Nachricht wurde erfolgreich gesendet. {nickname || fullName} wird sich bei Dir
            melden, wenn Interesse besteht.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setShowConfirmation(false)} variant="secondary">
              Schließen
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

ExhibitorCard.fragment = EXHIBITOR_FRAGMENT

export default ExhibitorCard
