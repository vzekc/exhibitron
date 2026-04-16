/** Format a Date as "YYYY-MM-DD" using local timezone. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse a "YYYY-MM-DD" string as a local-timezone Date (noon to avoid DST edge cases). */
export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
