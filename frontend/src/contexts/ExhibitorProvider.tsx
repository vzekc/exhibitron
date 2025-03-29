import { ReactNode, useCallback, useEffect, useState } from 'react'
import { fetchCurrentExhibitor, ExhibitorContext, Exhibitor } from './ExhibitorContext.ts'

interface UserProviderProps {
  children: ReactNode
}

export const ExhibitorProvider = ({ children }: UserProviderProps) => {
  const [exhibitor, setExhibitor] = useState<Exhibitor | undefined>()
  const [loading, setLoading] = useState(true)

  const reloadExhibitor = useCallback(async () => {
    const exhibitorProfile = await fetchCurrentExhibitor()
    setExhibitor(exhibitorProfile || undefined)
  }, [])

  useEffect(() => {
    const load = async () => {
      setExhibitor((await fetchCurrentExhibitor()) || undefined)
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return null // Prevents context usage before it's ready

  return (
    <ExhibitorContext.Provider value={{ exhibitor, reloadExhibitor }}>
      {children}
    </ExhibitorContext.Provider>
  )
}
