import { getExhibit } from '../api'
import { createContext, useContext } from 'react'
import { ExhibitListItem } from '../types.ts'

export const fetchExhibitList = async () => {
  const response = await getExhibit({
    validateStatus: (status) => status == 200,
  })
  if (response.status === 200) {
    return response.data
  }
}

export interface ExhibitionDataContextType {
  exhibitList: ExhibitListItem[] | undefined
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
