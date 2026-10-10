import React, { useLayoutEffect, useRef, useState } from 'react'
import DropdownMenu from './DropdownMenu.tsx'

/*
 * The menu bar shows as many entries as fit, in their order, and puts the rest
 * into a "Mehr" dropdown at its end. The entry of the page being shown stays in
 * the bar whatever its place, so the bar always says where one is.
 *
 * Every entry is also rendered once, invisibly, to measure it; a resize of the
 * bar or of those measurements (a web font arriving) decides anew what fits.
 */

export interface PriorityNavEntry {
  key: string
  /* How the entry looks in the bar. */
  bar: React.ReactNode
  /* What stands for it in "Mehr" when the bar has no room for it. */
  more: React.ReactNode
  active?: boolean
}

/* Tailwind's gap-1.5, between the entries in the bar. */
const GAP = 6

const MoreLabel = () => (
  <span className="flex items-center rounded px-3 py-2 text-xl text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
    Mehr
    <svg
      className="ml-1 h-5 w-5 text-gray-400 dark:text-gray-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  </span>
)

/* A group of entries in "Mehr", folded until it is opened, so a long group
   such as Administration does not run the dropdown off the screen. */
export const MoreGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <li>
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded px-3 py-2 text-xl text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
        {label}
        <svg
          className="ml-1 h-5 w-5 text-gray-400 transition-transform group-open:rotate-90 dark:text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <ul className="pl-3">{children}</ul>
    </details>
  </li>
)

const PriorityNav = ({
  entries,
  className = '',
}: {
  entries: PriorityNavEntry[]
  className?: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  /* Indices of the entries in the bar; null while all of them fit. */
  const [shown, setShown] = useState<Set<number> | null>(null)
  const activeIndex = entries.findIndex((entry) => entry.active)
  const signature = entries.map((entry) => entry.key).join(' ')

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const fit = () => {
      const widths = [...measure.children].map((child) => child.getBoundingClientRect().width)
      const moreWidth = widths.pop() ?? 0
      const available = container.clientWidth
      const total = widths.reduce((sum, width) => sum + width + GAP, -GAP)
      if (total <= available) {
        setShown(null)
        return
      }
      const order = widths.map((_, index) => index)
      if (activeIndex >= 0) order.unshift(...order.splice(activeIndex, 1))
      const fitting = new Set<number>()
      let used = moreWidth
      for (const index of order) {
        if (used + GAP + widths[index] > available && index !== activeIndex) break
        fitting.add(index)
        used += GAP + widths[index]
      }
      setShown(fitting)
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    observer.observe(measure)
    return () => observer.disconnect()
  }, [signature, activeIndex])

  const overflow = shown ? entries.filter((_, index) => !shown.has(index)) : []

  return (
    <div ref={containerRef} className={`relative min-w-0 flex-1 ${className}`}>
      <ul className="flex items-center gap-1.5 whitespace-nowrap">
        {entries.map((entry, index) =>
          !shown || shown.has(index) ? <li key={entry.key}>{entry.bar}</li> : null,
        )}
        {overflow.length > 0 && (
          <li>
            <DropdownMenu label={<MoreLabel />}>
              {overflow.map((entry) => (
                <React.Fragment key={entry.key}>{entry.more}</React.Fragment>
              ))}
            </DropdownMenu>
          </li>
        )}
      </ul>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex w-max whitespace-nowrap">
        {entries.map((entry) => (
          <div key={entry.key} className="shrink-0">
            {entry.bar}
          </div>
        ))}
        <div className="shrink-0">
          <MoreLabel />
        </div>
      </div>
    </div>
  )
}

export default PriorityNav
