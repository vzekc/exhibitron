import { useState } from 'react'

type ToggleButtonProps = {
  option1: string
  option2: string
  defaultOption?: string
  onChange?: (value: string) => void
}

const ToggleButton = ({
  option1,
  option2,
  defaultOption = option1,
  onChange,
}: ToggleButtonProps) => {
  const [selected, setSelected] = useState(defaultOption)

  const handleSelect = (value: string) => {
    setSelected(value)
    onChange?.(value)
  }

  return (
    <div className="relative inline-flex h-10 rounded-lg border border-gray-300 p-1">
      <div
        className={`absolute h-8 w-[calc(50%-4px)] rounded-md bg-blue-500 transition-all duration-200 ${
          selected === option1 ? 'left-1' : 'left-[calc(50%+2px)]'
        }`}
      />
      <button
        className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors ${
          selected === option1 ? 'text-white' : 'text-gray-700'
        }`}
        onClick={() => handleSelect(option1)}>
        {option1}
      </button>
      <button
        className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors ${
          selected === option2 ? 'text-white' : 'text-gray-700'
        }`}
        onClick={() => handleSelect(option2)}>
        {option2}
      </button>
    </div>
  )
}

export default ToggleButton
