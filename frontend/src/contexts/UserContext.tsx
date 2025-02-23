import { ReactNode, use } from 'react'
import { fetchUserProfile, UserContext } from './userUtils.ts'

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const user = use(fetchUserProfile)

  return <UserContext value={{ user }}>{children}</UserContext>
}
