import { ReactNode, useCallback, useEffect, useState } from 'react'
import {
  fetchCurrentExhibitor,
  fetchCurrentUser,
  ExhibitorContext,
  Exhibitor,
  CurrentUser,
} from './ExhibitorContext.ts'

interface UserProviderProps {
  children: ReactNode
}

export const ExhibitorProvider = ({ children }: UserProviderProps) => {
  const [exhibitor, setExhibitor] = useState<Exhibitor | undefined>()
  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>()
  const [loading, setLoading] = useState(true)

  const reloadExhibitor = useCallback(async () => {
    const [exhibitorProfile, userProfile] = await Promise.all([
      fetchCurrentExhibitor(),
      fetchCurrentUser(),
    ])
    setExhibitor(exhibitorProfile || undefined)
    setCurrentUser(userProfile || undefined)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [exhibitorProfile, userProfile] = await Promise.all([
        fetchCurrentExhibitor(),
        fetchCurrentUser(),
      ])
      setExhibitor(exhibitorProfile || undefined)
      setCurrentUser(userProfile || undefined)
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return null // Prevents context usage before it's ready

  return (
    <ExhibitorContext.Provider value={{ exhibitor, currentUser, reloadExhibitor }}>
      {children}
    </ExhibitorContext.Provider>
  )
}
