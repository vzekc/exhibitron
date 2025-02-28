import { ReactNode, useEffect, useState } from 'react'
import { fetchUserProfile, UserContext } from './UserContext.ts'
import { User } from '../types.ts'

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setUser(await fetchUserProfile())
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return null // Prevents context usage before it's ready

  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  )
}
