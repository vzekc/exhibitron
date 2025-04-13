import { useState, useRef, useEffect } from 'react'
import { getDisplayName } from '@utils/displayName'

interface User {
  fullName: string
  nickname: string | null
}

interface ExhibitorSelectorProps {
  options: Array<{ id: number; user: User }>
  onSelect: (exhibitorId: number) => void
}

const ExhibitorSelector = ({ options, onSelect }: ExhibitorSelectorProps) => {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAbove, setShowAbove] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter((option) =>
    getDisplayName(option.user).toLowerCase().includes(inputValue.toLowerCase()),
  )

  useEffect(() => {
    if (showDropdown && inputRef.current && dropdownRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect()
      const dropdownHeight = dropdownRef.current.offsetHeight
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - inputRect.bottom
      const spaceAbove = inputRect.top

      // Show above if there's not enough space below but enough space above
      setShowAbove(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight)
    }
  }, [showDropdown, filteredOptions.length])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.debug('Input change:', e.target.value)
    setInputValue(e.target.value)
    setShowDropdown(true)
  }

  const handleSelect = (exhibitorId: number) => {
    console.debug('Selecting exhibitor:', exhibitorId)
    const selectedExhibitor = options.find((opt) => opt.id === exhibitorId)
    if (selectedExhibitor) {
      setInputValue(getDisplayName(selectedExhibitor.user))
    }
    onSelect(exhibitorId)
    setShowDropdown(false)
  }

  const handleBlur = () => {
    console.debug('Input blur event triggered')
    setTimeout(() => {
      console.debug('Blur timeout fired')
      setShowDropdown(false)
      setShowAbove(false)
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.debug('Key down:', e.key)
    if (e.key === 'Enter') {
      e.preventDefault()

      const exactMatch = options.find(
        (opt) => getDisplayName(opt.user).toLowerCase() === inputValue.toLowerCase(),
      )

      if (exactMatch) {
        handleSelect(exactMatch.id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (showDropdown) {
        if (inputValue.trim() !== '') {
          setInputValue('')
        } else {
          setShowDropdown(false)
          setShowAbove(false)
        }
      }
    }
  }

  const inputRect = inputRef.current?.getBoundingClientRect()
  const dropdownHeight = dropdownRef.current?.offsetHeight || 0

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          console.debug('Input focus event triggered')
          setInputValue('')
          setShowDropdown(true)
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Aussteller auswählen..."
        className="w-full rounded border border-gray-300 p-2"
      />

      {showDropdown && inputRect && (
        <div
          ref={dropdownRef}
          className={`fixed max-h-60 overflow-auto rounded border border-gray-300 bg-white shadow-lg ${
            showAbove ? 'bottom-full mb-1' : 'top-full'
          }`}
          style={{
            zIndex: 9999,
            width: inputRef.current?.offsetWidth,
            left: inputRect.left,
            top: showAbove ? inputRect.top - dropdownHeight - 4 : inputRect.bottom + 4,
            marginTop: showAbove ? 0 : undefined,
            marginBottom: showAbove ? 4 : undefined,
          }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                className="cursor-pointer p-2 hover:bg-gray-100"
                onMouseDown={() => handleSelect(option.id)}>
                {getDisplayName(option.user)}
              </div>
            ))
          ) : (
            <div className="p-2 italic text-gray-500">Keine passenden Aussteller gefunden</div>
          )}
        </div>
      )}
    </div>
  )
}

export default ExhibitorSelector
