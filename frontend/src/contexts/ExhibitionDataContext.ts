import { createContext, useContext } from 'react'
import { ExhibitListItem } from '../types.ts'

export interface ExhibitionDataContextType {
  exhibitList: ExhibitListItem[] | undefined
  reloadExhibitList: () => Promise<void>
}

export const ExhibitionDataContext = createContext<
  ExhibitionDataContextType | undefined
>(undefined)

export const useExhibitionData = () => {
  const context = useContext(ExhibitionDataContext)
  if (!context) {
    throw new Error(
      'useExhibitionData must be used within a ExhibitionProvider',
    )
  }
  return context
}
