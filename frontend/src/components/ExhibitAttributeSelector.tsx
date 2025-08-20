import { useState, useRef, useEffect } from 'react'

interface ComboBoxProps {
  options: Array<{ id: number; name: string }>
  onSelect: (name: string) => void
  onCreateNew: (name: string) => Promise<void>
}

export const ExhibitAttributeSelector = ({ options, onSelect, onCreateNew }: ComboBoxProps) => {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(inputValue.toLowerCase()),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowDropdown(true)
  }

  const handleSelect = (name: string) => {
    setInputValue('')
    onSelect(name)
    setShowDropdown(false)
  }

  const handleBlur = () => {
    // If input has a value and it's not in existing options, show confirmation
    if (
      inputValue.trim() !== '' &&
      !options.some((opt) => opt.name.toLowerCase() === inputValue.toLowerCase())
    ) {
      setShowConfirmation(true)
    } else {
      setShowDropdown(false)
    }
  }

  const handleCreateAttribute = async () => {
    if (inputValue.trim()) {
      await onCreateNew(inputValue)
      setInputValue('')
      setShowConfirmation(false)
    }
  }

  const handleCancelCreate = () => {
    setShowConfirmation(false)
    // Return focus to input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      // If we have an exact match in the options, select it
      const exactMatch = options.find((opt) => opt.name.toLowerCase() === inputValue.toLowerCase())

      if (exactMatch) {
        handleSelect(exactMatch.name)
      } else if (inputValue.trim() !== '') {
        // If no exact match but we have input, show confirmation
        setShowConfirmation(true)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (showConfirmation) {
        handleCancelCreate()
      } else if (showDropdown) {
        if (inputValue.trim() !== '') {
          // Clear input if there's text
          setInputValue('')
        } else {
          // Close dropdown if input is already empty
          setShowDropdown(false)
        }
      }
    }
  }

  useEffect(() => {
    if (showConfirmation && inputRef.current) {
      // Focus will be set on first interactive element in modal
    }
  }, [showConfirmation])

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Attribut auswählen oder neu erstellen"
        className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />

      {showDropdown && !showConfirmation && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                className="cursor-pointer p-2 text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600"
                onMouseDown={() => handleSelect(option.name)} // Use mousedown to fire before blur
              >
                {option.name}
              </div>
            ))
          ) : (
            <div className="p-2 italic text-gray-500 dark:text-gray-400">
              Keine passenden Attribute gefunden
            </div>
          )}
        </div>
      )}

      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelCreate()
            }
          }}
          tabIndex={-1}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Neues Attribut anlegen
            </h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Willst Du das Attribut "{inputValue}" erstellen?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                onClick={handleCancelCreate}>
                Abbrechen
              </button>
              <button
                type="button"
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                onClick={handleCreateAttribute}>
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
