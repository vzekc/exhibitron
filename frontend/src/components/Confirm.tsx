import Modal from './Modal.tsx'
import React from 'react'

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
    <p>{message}</p>
    <footer>
      <button onClick={onConfirm}>{confirm}</button>
      <button onClick={onClose}>{cancel}</button>
    </footer>
  </Modal>
)

export default Confirm
