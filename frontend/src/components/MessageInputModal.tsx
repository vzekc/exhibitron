import React, { useState } from 'react'
import Modal from './Modal'

interface MessageInputModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (message: string) => void
  title: string
  submitLabel: string
}

const MessageInputModal: React.FC<MessageInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitLabel,
}) => {
  const [message, setMessage] = useState('')

  const handleSubmit = () => {
    onSubmit(message)
    setMessage('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}>
        <label htmlFor="personal-message">
          <textarea
            id="personal-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Gib eine persönliche Nachricht ein..."
            rows={4}
          />
        </label>
        <footer>
          <button type="submit">{submitLabel}</button>
        </footer>
      </form>
    </Modal>
  )
}

export default MessageInputModal
