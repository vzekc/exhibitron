import { ReactNode, useEffect, useState } from 'react'
import { fetchCurrentExhibition, ExhibitionContext, Exhibition } from './ExhibitionContext.ts'

interface ExhibitionProviderProps {
  children: ReactNode
}

export const ExhibitionProvider = ({ children }: ExhibitionProviderProps) => {
  const [exhibition, setExhibition] = useState<Exhibition | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setExhibition((await fetchCurrentExhibition()) || undefined)
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return null

  return <ExhibitionContext.Provider value={{ exhibition }}>{children}</ExhibitionContext.Provider>
}
