import { useEffect, useState } from 'react'
import { useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import Modal from '@components/Modal'
import Button from '@components/Button'
import { showMessage } from '@components/MessageModalUtil'
import QuarterHourSelect from './QuarterHourSelect'
import { clock, duration, weekday } from './coverage'
import type { CalendarActivity, CalendarPeriod, OwnShift } from './VolunteerCalendar'

const BOOK_SLOT = graphql(`
  mutation BookVolunteerSlot($input: BookVolunteerSlotInput!) {
    bookVolunteerSlot(input: $input) {
      id
      startTime
      endTime
    }
  }
`)

/* Short ones matter: the gap before one's next shift may be a quarter hour. */
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240]

interface SignUpDialogProps {
  activity: CalendarActivity
  period: CalendarPeriod
  startTime: Date
  ownShifts?: OwnShift[]
  onClose: () => void
  onBooked: () => void
}

const clockValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/* Quarter hours, as the server counts them. */
const roundToQuarter = (date: Date) => {
  const rounded = new Date(date)
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 15) * 15, 0, 0)
  return rounded
}

const SignUpDialog = ({
  activity,
  period,
  startTime,
  ownShifts = [],
  onClose,
  onBooked,
}: SignUpDialogProps) => {
  const [start, setStart] = useState(() => roundToQuarter(startTime))
  const [minutes, setMinutes] = useState(0)

  const [bookSlot, { loading: booking }] = useMutation(BOOK_SLOT)

  const periodEnd = new Date(period.endTime)

  useEffect(() => setStart(roundToQuarter(startTime)), [startTime])

  /*
   * A shift ends where the period ends, and where the next shift of this
   * volunteer begins — nobody can be in two places at once, and the server
   * would refuse it anyway.
   */
  const nextOwnShift = ownShifts
    .map((shift) => new Date(shift.startTime))
    .filter((shiftStart) => shiftStart > start)
    .sort((a, b) => a.getTime() - b.getTime())[0]
  const latestEnd = nextOwnShift && nextOwnShift < periodEnd ? nextOwnShift : periodEnd

  const available = DURATIONS.filter(
    (candidate) => start.getTime() + candidate * 60_000 <= latestEnd.getTime(),
  )
  const durations = available.length ? available : [15]

  /* Two hours unless less is left, and whatever was picked once it was. */
  const suggested = durations.filter((candidate) => candidate <= 120).at(-1) ?? durations[0]
  const slot = {
    periodId: period.id,
    startTime: start.toISOString(),
    durationMinutes: durations.includes(minutes) ? minutes : suggested,
  }

  const book = async () => {
    const result = await bookSlot({ variables: { input: slot } })
    if (result.errors?.length) {
      await showMessage('Das ging nicht', result.errors[0]?.message ?? 'Unbekannter Fehler', 'OK')
      return
    }
    await showMessage(
      'Eingetragen',
      `Danke! Du hilfst am ${weekday(start)} von ${clock(start)} bis ${clock(
        new Date(start.getTime() + slot.durationMinutes * 60_000),
      )} bei „${activity.name}“.`,
      'OK',
    )
    onBooked()
  }

  return (
    <Modal isOpen onClose={onClose} title={activity.name}>
      <div className="space-y-4 p-4">
        <p className="text-gray-600 dark:text-gray-400">
          Hilfe gebraucht am {weekday(period.startTime)} von {clock(period.startTime)} bis{' '}
          {clock(period.endTime)}
          {period.neededCount ? `, ${period.neededCount} Leute` : ', beliebig viele Leute'}.
        </p>

        <label className="block">
          <span className="text-sm text-gray-600 dark:text-gray-400">Ab wann kannst du?</span>
          <span className="mt-1 block">
            <QuarterHourSelect
              value={clockValue(start)}
              /* Only times the period actually covers, up to its last quarter. */
              from={clockValue(new Date(period.startTime))}
              to={clockValue(new Date(periodEnd.getTime() - 15 * 60_000))}
              onChange={(picked) => {
                const [hours, minutesPart] = picked.split(':').map(Number)
                const next = new Date(start)
                next.setHours(hours, minutesPart, 0, 0)
                setStart(next)
              }}
            />
          </span>
        </label>

        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Wie lange?</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {durations.map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setMinutes(candidate)}
                className={`rounded-md border px-3 py-1 text-sm ${
                  slot.durationMinutes === candidate
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
                }`}>
                {duration(candidate)}
              </button>
            ))}
          </div>
          {nextOwnShift && nextOwnShift < periodEnd && (
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
              Ab {clock(nextOwnShift)} bist du schon woanders eingetragen.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={book} disabled={booking}>
            Eintragen
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SignUpDialog
