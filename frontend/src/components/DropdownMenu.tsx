import React, { useEffect, useRef, useState } from 'react'

const DropdownMenu = ({ label, children }: { label: string; children: React.ReactNode }) => {
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

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <details ref={detailsRef} className="relative" onToggle={handleToggle}>
      <summary className="flex cursor-pointer items-center bg-white px-3 py-2">
        {label}
        <svg
          className="ml-1 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <ul className="absolute right-0 z-40 w-48 border border-gray-200 bg-white py-1 shadow">
        {children}
      </ul>
    </details>
  )
}

export default DropdownMenu
