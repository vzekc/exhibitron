import React from 'react'

interface DurationSelectorProps {
  selectedDuration: number
  onChange: (duration: number) => void
}

const DurationSelector: React.FC<DurationSelectorProps> = ({ selectedDuration, onChange }) => {
  const durations = [15, 30, 45, 60, 90, 120]

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    if (minutes % 60 === 0) return `${minutes / 60}h`
    return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, '0')}h`
  }

  return (
    <div className="flex gap-1">
      {durations.map((duration) => (
        <button
          key={duration}
          type="button"
          onClick={() => onChange(duration)}
          className={`min-w-12 rounded-md border px-2 py-1 text-sm ${
            selectedDuration === duration
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}>
          {formatDuration(duration)}
        </button>
      ))}
    </div>
  )
}

export default DurationSelector
