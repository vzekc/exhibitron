import { createContext, useContext } from 'react'
import { ExhibitionData } from '@services/exhibitionData.ts'

export interface ExhibitionDataContextType {
  exhibitionData: ExhibitionData | null
  reloadExhibitionData: () => Promise<void>
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
