import React from 'react'

interface DaySelectorProps {
  availableDates: string[]
  selectedDate: string
  onChange: (date: string) => void
}

const DaySelector: React.FC<DaySelectorProps> = ({ availableDates, selectedDate, onChange }) => {
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  return (
    <div className="flex gap-1">
      {availableDates.map((date) => {
        const dayDate = new Date(date)
        const weekday = weekdays[dayDate.getDay()]
        const dayOfMonth = dayDate.getDate()

        return (
          <button
            key={date}
            type="button"
            onClick={() => onChange(date)}
            className={`min-w-12 rounded-md border px-2 py-1 text-sm ${
              selectedDate === date
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
            <div className="font-medium">{weekday}</div>
            <div className="text-xs">{dayOfMonth}.</div>
          </button>
        )
      })}
    </div>
  )
}

export default DaySelector
