import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const DropdownMenu = ({
  label,
  children,
}: {
  label: string | React.ReactNode
  children: React.ReactNode
}) => {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const dropdownRef = useRef<HTMLUListElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    const details = detailsRef.current
    if (!details) return

    // Find all links inside the dropdown
    const links = details.querySelectorAll('a')

    // Function to close dropdown
    const closeDropdown = () => {
      details.removeAttribute('open')
      setIsOpen(false)
    }

    // Add click event to each link
    links.forEach((link) => link.addEventListener('click', closeDropdown))

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (details && !details.contains(event.target as Node) && details.hasAttribute('open')) {
        closeDropdown()
      }
    }

    document.addEventListener('click', handleClickOutside)

    return () => {
      // Cleanup event listeners
      links.forEach((link) => link.removeEventListener('click', closeDropdown))
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    const details = detailsRef.current
    if (details) {
      const rect = details.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 192, // 48rem = 192px (w-48 class)
        width: 192,
      })

      if (details.hasAttribute('open')) {
        details.removeAttribute('open')
        setIsOpen(false)
      } else {
        details.setAttribute('open', '')
        setIsOpen(true)
      }
    }
  }

  return (
    <>
      <details ref={detailsRef} className="relative">
        <summary
          className="flex cursor-pointer list-none items-center bg-white"
          onClick={handleToggle}>
          <div onClick={(e) => e.preventDefault()}>{label}</div>
        </summary>
      </details>
      {isOpen &&
        createPortal(
          <ul
            ref={dropdownRef}
            className="fixed z-[60] w-48 border border-gray-200 bg-white py-1 shadow"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}>
            {children}
          </ul>,
          document.body,
        )}
    </>
  )
}

export default DropdownMenu
