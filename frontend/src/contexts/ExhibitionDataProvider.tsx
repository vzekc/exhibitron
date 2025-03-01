import { ReactNode, useCallback, useEffect, useState } from 'react'

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

  const reloadExhibitList = useCallback(async () => {
    const result = await fetchExhibitList()
    const { items } = result || {}
    if (items) {
      setExhibitList(items)
    }
  }, [setExhibitList])

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
  }, [setLoading, setExhibitList])

  if (loading) return null // Prevents context usage before it's ready

  return (
    <ExhibitionDataContext.Provider value={{ exhibitList, reloadExhibitList }}>
      {children}
    </ExhibitionDataContext.Provider>
  )
}
