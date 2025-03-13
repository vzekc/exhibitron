import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const useUnsavedChangesWarning = (hasUnsavedChanges: boolean) => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && hasUnsavedChanges) {
        e.preventDefault()
        const href = link.getAttribute('href')
        if (href) {
          const confirmed = window.confirm(
            'Willst Du die Seite wirklich verlassen, ohne die Änderungen zu speichern?',
          )
          if (confirmed) {
            navigate(href)
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [hasUnsavedChanges, navigate])
}
