import { ReactNode, useCallback, useEffect, useState } from 'react'

import { ExhibitionDataContext } from './ExhibitionDataContext.ts'
import { fetchExhibitionData, type ExhibitionData } from '../services/exhibitionData.ts'

interface ExhibitionDataProviderProps {
  children: ReactNode
}

export const ExhibitionDataProvider = ({
  children,
}: ExhibitionDataProviderProps) => {
  const [exhibitionData, setExhibitionData] = useState<ExhibitionData | null>(null)
  const [loading, setLoading] = useState(true)

  const reloadExhibitionData = useCallback(async () => {
    setExhibitionData(await fetchExhibitionData())
  }, [setExhibitionData])

  useEffect(() => {
    const load = async () => {
      setExhibitionData(await fetchExhibitionData())
      setLoading(false)
    }
    void load()
  }, [setLoading, setExhibitionData])

  if (loading) return null // Prevents context usage before it's ready

  return (
    <ExhibitionDataContext.Provider value={{ exhibitionData, reloadExhibitionData }}>
      {children}
    </ExhibitionDataContext.Provider>
  )
}
