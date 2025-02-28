import { createContext, useContext } from 'react'

interface BreadcrumbContextType {
  detailName: string
  setDetailName: (name: string) => void
}

export const BreadcrumbContext = createContext<
  BreadcrumbContextType | undefined
>(undefined)

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext)
  if (!context)
    throw new Error('useBreadcrumb must be used within BreadcrumbProvider')
  return context
}
