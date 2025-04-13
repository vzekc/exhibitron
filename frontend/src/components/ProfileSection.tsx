import Icon from './Icon'
import { getDisplayName } from '@utils/displayName'

type ProfileSectionProps = {
  userId: string
  fullName: string
  nickname: string | null
  profileImage: boolean
  topic?: string | null
}

const ProfileSection = ({
  userId,
  fullName,
  nickname,
  profileImage,
  topic,
}: ProfileSectionProps) => {
  const displayName = getDisplayName({ fullName, nickname })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-[150px] w-[150px] items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
            {profileImage ? (
              <img
                src={`/api/user/${userId}/image/profile`}
                alt={`Profile of ${displayName}`}
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <Icon
                name="user"
                alt="User"
                className="h-10 h-[60px] w-10 w-[60px] text-gray-400 opacity-15 dark:text-gray-500"
              />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-gray-100">
            {displayName}
          </h2>
          {nickname && (
            <p className="truncate text-sm text-gray-600 dark:text-gray-400">
              {getDisplayName({ fullName, nickname })}
            </p>
          )}
        </div>
      </div>
      {topic && <p className="text-lg text-gray-700 dark:text-gray-300">{topic}</p>}
    </div>
  )
}

export default ProfileSection
