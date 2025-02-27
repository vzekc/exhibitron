import { createContext, useContext, useState, ReactNode } from 'react'

interface BreadcrumbContextType {
  detailName: string
  setDetailName: (name: string) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
  undefined,
)

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
  const [detailName, setDetailName] = useState('')

  return (
    <BreadcrumbContext.Provider value={{ detailName, setDetailName }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext)
  if (!context)
    throw new Error('useBreadcrumb must be used within BreadcrumbProvider')
  return context
}
