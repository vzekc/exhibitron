import { createContext, useContext, ReactNode } from 'react'
import { use } from 'react'
import { fetchUserProfile } from './userUtils.ts'

type UserProfile = Awaited<ReturnType<typeof fetchUserProfile>>

interface UserContextType {
  user: UserProfile | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

interface UserProviderProps {
  children: ReactNode
}

const dataPromise = fetchUserProfile()

export const UserProvider = ({ children }: UserProviderProps) => {
  const user = use(dataPromise)

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  )
}
