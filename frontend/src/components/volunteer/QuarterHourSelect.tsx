/*
 * A time to the quarter hour, and nothing else. A `time` input lets anybody
 * type 10:07 whatever its step says, and the server then refuses the shift —
 * so the choice is made from a list instead.
 */

const asMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const asTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

interface QuarterHourSelectProps {
  value: string
  onChange: (value: string) => void
  /* The first and last time worth offering, both included. */
  from?: string
  to?: string
  className?: string
}

const QuarterHourSelect = ({
  value,
  onChange,
  from = '00:00',
  to = '23:45',
  className = '',
}: QuarterHourSelectProps) => {
  const first = asMinutes(from)
  const last = asMinutes(to)
  const times = []
  for (let minutes = first; minutes <= last; minutes += 15) {
    times.push(asTime(minutes))
  }
  /* Whatever is set stays selectable, even if it falls outside the range. */
  if (value && !times.includes(value)) times.unshift(value)

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 ${className}`}>
      {times.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  )
}

export default QuarterHourSelect
