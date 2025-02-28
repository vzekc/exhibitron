import { ReactNode, useEffect, useState } from 'react'

import { ExhibitListItem } from '../types.ts'
import {
  ExhibitionDataContext,
  fetchExhibitList,
} from './ExhibitionDataContext.ts'

interface ExhibitionDataProviderProps {
  children: ReactNode
}

export const ExhibitionDataProvider = ({
  children,
}: ExhibitionDataProviderProps) => {
  const [exhibitList, setExhibitList] = useState<ExhibitListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const result = await fetchExhibitList()
      const { items } = result || {}
      if (items) {
        setExhibitList(items)
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return null // Prevents context usage before it's ready

  return (
    <ExhibitionDataContext.Provider value={{ exhibitList }}>
      {children}
    </ExhibitionDataContext.Provider>
  )
}
