import { createContext, useContext } from 'react'

interface BreadcrumbContextType {
  detailNames: { [path: string]: string }
  setDetailName: (path: string, name: string) => void
}

export const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}
