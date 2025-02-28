import { useState, ReactNode } from 'react'
import { BreadcrumbContext } from './BreadcrumbContext.ts'

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
  const [detailName, setDetailName] = useState('')

  return (
    <BreadcrumbContext.Provider value={{ detailName, setDetailName }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}
