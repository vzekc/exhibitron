import React, { useRef, useEffect } from 'react'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    console.log('Modal isOpen changed:', isOpen)
    if (isOpen) {
      console.log('Showing modal')
      dialogRef.current?.showModal()
    } else {
      console.log('Closing modal')
      if (dialogRef.current?.open) {
        dialogRef.current?.close()
      }
    }
  }, [isOpen])

  const handleClickOutside = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current && onClose) {
      onClose()
    }
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} onClick={handleClickOutside}>
      <article>
        <header style={{ minHeight: '2.5rem' }}>
          <button className="close" aria-label="Close" onClick={onClose}></button>
          <p>{title}</p>
        </header>
        {children}
      </article>
    </dialog>
  )
}

export default Modal
