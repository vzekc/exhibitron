import { useState } from 'react'
import MessageModal from '@components/MessageModal.tsx'
import { createRoot } from 'react-dom/client'

export const showMessage = (
  title: string,
  message: string,
  buttonText: string = 'OK',
): Promise<void> => {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const MessageModalWrapper = () => {
      const [isOpen, setIsOpen] = useState(true)

      const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
          document.body.removeChild(container)
          resolve()
        }, 100)
      }

      return (
        <MessageModal
          isOpen={isOpen}
          title={title}
          message={message}
          buttonText={buttonText}
          onClose={handleClose}
        />
      )
    }

    const root = createRoot(container)
    root.render(<MessageModalWrapper />)
  })
}
