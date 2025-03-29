import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Confirm from './Confirm'

// Utility function to show a confirmation dialog programmatically
export const showConfirm = (
  title: string,
  message: string,
  confirmText: string = 'OK',
  cancelText: string = 'Abbrechen',
): Promise<boolean> => {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const ConfirmDialogWrapper = () => {
      const [isOpen, setIsOpen] = useState(true)

      const handleConfirm = () => {
        setIsOpen(false)
        setTimeout(() => {
          document.body.removeChild(container)
          resolve(true)
        }, 100)
      }

      const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
          document.body.removeChild(container)
          resolve(false)
        }, 100)
      }

      return (
        <Confirm
          isOpen={isOpen}
          title={title}
          message={message}
          confirm={confirmText}
          cancel={cancelText}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )
    }

    const root = createRoot(container)
    root.render(<ConfirmDialogWrapper />)
  })
}
