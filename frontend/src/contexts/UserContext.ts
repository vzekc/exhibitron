import { getUserProfile } from '../api'
import { createContext, useContext } from 'react'
import { User } from '../types.ts'

export const fetchUserProfile = async () => {
  const response = await getUserProfile({
    validateStatus: (status) => status == 200 || status == 401,
  })
  if (response.status === 200) {
    return response.data
  }
}

export interface UserContextType {
  user: User | undefined
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
