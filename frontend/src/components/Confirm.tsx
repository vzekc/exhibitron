import React from 'react'
import Modal from './Modal.tsx'
import Button from './Button.tsx'

interface ConfirmProps {
  title: string
  message: string
  confirm: string
  cancel: string
  onConfirm: () => void
  onClose: () => void
  isOpen: boolean
}

const Confirm: React.FC<ConfirmProps> = ({
  title,
  message,
  confirm,
  cancel,
  onConfirm,
  onClose,
  isOpen,
}) => (
  <Modal isOpen={isOpen} title={title} onClose={onClose}>
    <p className="mb-6 text-gray-900 dark:text-gray-100">{message}</p>
    <footer className="flex justify-end space-x-2 border-t border-gray-200 pt-4">
      <Button
        variant="secondary"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}>
        {cancel}
      </Button>
      <Button
        variant="danger"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onConfirm()
        }}>
        {confirm}
      </Button>
    </footer>
  </Modal>
)

export default Confirm
