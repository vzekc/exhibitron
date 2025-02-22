import { getUserProfile } from '../api'
import { createContext, useContext } from 'react'

type GetUserProfileResponse = Awaited<ReturnType<typeof getUserProfile>>['data']

export const fetchUserProfile =
  (async (): Promise<GetUserProfileResponse | null> => {
    const response = await getUserProfile({
      validateStatus: (status) => status == 200 || status == 401,
    })
    if (response.status === 200) {
      return response.data
    } else {
      return null
    }
  })()

type UserProfile = Awaited<typeof fetchUserProfile>

interface UserContextType {
  user: UserProfile | null
}

export const UserContext = createContext<UserContextType | undefined>(undefined)
export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
