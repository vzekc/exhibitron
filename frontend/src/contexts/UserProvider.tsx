import { ReactNode, useCallback, useEffect, useState } from 'react'
import { fetchCurrentUser, UserContext, User } from './UserContext.ts'

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | undefined>()
  const [loading, setLoading] = useState(true)

  const reloadUser = useCallback(async () => {
    const userProfile = await fetchCurrentUser()
    setUser(userProfile)
  }, [])

  useEffect(() => {
    const load = async () => {
      setUser(await fetchCurrentUser())
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return null // Prevents context usage before it's ready

  return <UserContext.Provider value={{ user, reloadUser }}>{children}</UserContext.Provider>
}
