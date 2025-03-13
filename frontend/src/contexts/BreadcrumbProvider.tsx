import { useState, ReactNode, useCallback } from 'react'
import { BreadcrumbContext } from './BreadcrumbContext.ts'

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
  const [detailNames, setDetailNames] = useState<{ [path: string]: string }>({})

  const setDetailName = useCallback((path: string, name: string) => {
    setDetailNames((prev) => ({ ...prev, [path]: name }))
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ detailNames, setDetailName }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}
