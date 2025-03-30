import React, { useEffect, useRef, useState } from 'react'

const DropdownMenu = ({
  label,
  children,
}: {
  label: string | React.ReactNode
  children: React.ReactNode
}) => {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [isOpen, setIsOpen] = useState(false)

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
      if (details.hasAttribute('open')) {
        details.removeAttribute('open')
      } else {
        details.setAttribute('open', '')
      }
      setIsOpen(!isOpen)
    }
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className="flex cursor-pointer list-none items-center bg-white"
        onClick={handleToggle}>
        <div onClick={(e) => e.preventDefault()}>{label}</div>
      </summary>
      <ul className="absolute right-0 z-40 w-48 border border-gray-200 bg-white py-1 shadow">
        {children}
      </ul>
    </details>
  )
}

export default DropdownMenu
