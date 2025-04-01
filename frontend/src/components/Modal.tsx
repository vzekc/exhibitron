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
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
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
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleClickOutside}
      className="mx-auto w-full max-w-lg rounded-lg bg-white p-0 backdrop:bg-gray-800/50 dark:bg-gray-800">
      <article className="w-full p-0">
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="p-4">{children}</div>
      </article>
    </dialog>
  )
}

export default Modal
