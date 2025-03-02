import { getUserCurrent } from '../api'
import { createContext, useContext } from 'react'
import { User } from '../types.ts'

export const fetchUserProfile = async (): Promise<User | undefined> => {
  const response = await getUserCurrent({
    validateStatus: (status) => status == 200 || status == 204,
  })
  if (response.status === 200 && response.data) {
    return response.data
  }
}

export interface UserContextType {
  user: User | undefined
  reloadUser: () => Promise<void>
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
