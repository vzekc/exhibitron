import React, { useEffect, useRef } from 'react'

const DropdownMenu = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const details = detailsRef.current
    if (!details) return

    // Find all links inside the dropdown
    const links = details.querySelectorAll('a')

    // Function to close dropdown
    const closeDropdown = () => {
      details.removeAttribute('open')
    }

    // Add click event to each link
    links.forEach((link) => link.addEventListener('click', closeDropdown))

    return () => {
      // Cleanup event listeners
      links.forEach((link) => link.removeEventListener('click', closeDropdown))
    }
  }, [])

  return (
    <details ref={detailsRef} className="dropdown">
      <summary>{label}</summary>
      <ul className="dropdown-menu">{children}</ul>
    </details>
  )
}

export default DropdownMenu
