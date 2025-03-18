import { useState, ReactNode, useCallback } from 'react'
import { BreadcrumbContext, NavHistoryItem } from './BreadcrumbContext.ts'

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
  const [detailNames, setDetailNames] = useState<{ [path: string]: string }>({})
  const [navHistory, setNavHistory] = useState<NavHistoryItem[]>([{ path: '/', label: 'CC2025' }])

  const setDetailName = useCallback((path: string, name: string) => {
    setDetailNames((prev) => ({ ...prev, [path]: name }))
  }, [])

  const addToHistory = useCallback((path: string, label: string) => {
    setNavHistory((prev) => {
      // If we're navigating to the same path that's already in history, don't add it again
      if (prev.some((item) => item.path === path)) {
        // Filter out the path and all entries after it
        const index = prev.findIndex((item) => item.path === path)
        return prev.slice(0, index + 1)
      }

      // Otherwise add the new navigation entry
      return [...prev, { path, label }]
    })
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ detailNames, setDetailName, navHistory, addToHistory }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}
