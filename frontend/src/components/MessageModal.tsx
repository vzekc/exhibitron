import React from 'react'
import Modal from './Modal.tsx'
import Button from './Button.tsx'

interface MessageModalProps {
  title: string
  message: string
  buttonText?: string
  onClose: () => void
  isOpen: boolean
}

const MessageModal: React.FC<MessageModalProps> = ({
  title,
  message,
  buttonText = 'OK',
  onClose,
  isOpen,
}) => (
  <Modal isOpen={isOpen} title={title} onClose={onClose}>
    <div className="p-6">
      <p className="mb-6 text-gray-700">{message}</p>
      <footer className="flex justify-end space-x-2 border-t border-gray-200 pt-4">
        <Button variant="secondary" onClick={onClose}>
          {buttonText}
        </Button>
      </footer>
    </div>
  </Modal>
)

export default MessageModal
