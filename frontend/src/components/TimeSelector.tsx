import React from 'react'

interface TimeSelectorProps {
  startHour: number
  endHour: number
  timeSlotMinutes: number
  selectedTime: string
  onChange: (time: string) => void
  unavailableTimeSlots?: Set<string>
}

const TimeSelector: React.FC<TimeSelectorProps> = ({
  startHour,
  endHour,
  timeSlotMinutes,
  selectedTime,
  onChange,
  unavailableTimeSlots = new Set(),
}) => {
  // Create a flat array of all times
  const times: string[] = []

  for (let hour = startHour; hour < endHour; hour++) {
    const hourString = hour.toString().padStart(2, '0')
    for (let minute = 0; minute < 60; minute += timeSlotMinutes) {
      const minuteString = minute.toString().padStart(2, '0')
      times.push(`${hourString}:${minuteString}`)
    }
  }

  // Split times into rows of 4
  const rows: string[][] = []
  for (let i = 0; i < times.length; i += 4) {
    rows.push(times.slice(i, i + 4))
  }

  return (
    <div className="space-y-1">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((time) => {
            const isUnavailable = unavailableTimeSlots.has(time)
            return (
              <button
                key={time}
                type="button"
                onClick={() => !isUnavailable && onChange(time)}
                disabled={isUnavailable}
                className={`flex-1 rounded-md border px-2 py-1 text-sm ${
                  isUnavailable
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    : selectedTime === time
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                }`}>
                {time}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default TimeSelector
