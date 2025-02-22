import { ReactNode, use } from 'react'
import { fetchUserProfile, UserContext as UserContext1 } from './userUtils.ts'

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const user = use(fetchUserProfile)

  return <UserContext1 value={{ user }}>{children}</UserContext1>
}
