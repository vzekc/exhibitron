import Modal from './Modal.tsx'

interface ConfirmProps {
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
  isOpen: boolean
}

const Confirm: React.FC<ConfirmProps> = ({
  title,
  message,
  onConfirm,
  onClose,
  isOpen,
}) => {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <p>{message}</p>
      <footer>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </footer>
    </Modal>
  )
}

export default Confirm
