import { FragmentOf, graphql } from 'gql.tada'
import Icon from './Icon'
import Card from '@components/Card.tsx'

const EXHIBITOR_CHIP_FRAGMENT = graphql(`
  fragment ExhibitorChip on Exhibitor @_unmask {
    id
    topic
    user {
      id
      fullName
      nickname
      profileImage
    }
  }
`)

type ExhibitorChipProps = {
  exhibitor: FragmentOf<typeof EXHIBITOR_CHIP_FRAGMENT>
}

const ExhibitorChip = ({ exhibitor }: ExhibitorChipProps) => {
  const { topic, user } = exhibitor
  const { fullName, nickname, profileImage, id: userId } = user
  const displayName = nickname || fullName

  return (
    <Card to={`/exhibitor/${exhibitor.id}`} className="w-80">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-[100px] w-[100px] items-center justify-center rounded-md bg-gray-100">
            {profileImage ? (
              <img
                src={`/api/user/${userId}/image/profile`}
                alt={displayName}
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <Icon name="user" alt="User" className="h-10 w-10 text-gray-400" />
            )}
          </div>
        </div>
        <div className="flex flex-grow flex-col">
          <div className="text-xl">{displayName}</div>
          <div className="mt-auto text-sm text-gray-600">
            <div>{topic}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

ExhibitorChip.fragment = EXHIBITOR_CHIP_FRAGMENT

export default ExhibitorChip
