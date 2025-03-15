import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Confirm from '../components/Confirm'
import { createRoot } from 'react-dom/client'
import type { FC } from 'react'

export const useUnsavedChangesWarning = (hasUnsavedChanges: boolean) => {
  const navigate = useNavigate()

  const showConfirmDialog = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      const ConfirmationDialog: FC<{ onResolve: (value: boolean) => void }> = ({ onResolve }) => {
        return (
          <Confirm
            isOpen={true}
            title="Ungespeicherte Änderungen"
            message="Willst Du die Seite wirklich verlassen, ohne die Änderungen zu speichern?"
            confirm="Verlassen"
            cancel="Abbrechen"
            onConfirm={() => onResolve(true)}
            onClose={() => onResolve(false)}
          />
        )
      }

      const root = createRoot(container)
      root.render(
        <ConfirmationDialog
          onResolve={(value) => {
            root.unmount()
            document.body.removeChild(container)
            resolve(value)
          }}
        />,
      )
    })
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
      }
    }

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && hasUnsavedChanges) {
        e.preventDefault()
        const href = link.getAttribute('href')
        if (href) {
          const confirmed = await showConfirmDialog()
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
