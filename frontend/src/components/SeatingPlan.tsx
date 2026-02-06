import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import './SeatingPlan.css'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ReactSVG from './ReactSVG'
import { useExhibitor } from '@contexts/ExhibitorContext'
import { useExhibition } from '@contexts/ExhibitionContext'
import { FragmentOf } from 'gql.tada'
import TableInfoPanel from './seatingPlan/TableInfo'
import ExhibitorChip from './ExhibitorChip'
import ExhibitChip from './ExhibitChip'
import LoadInProgress from './LoadInProgress'
import { getDisplayName } from '@utils/displayName'

const GET_TABLES = graphql(
  `
    query GetTables {
      getCurrentExhibition {
        id
        tables {
          id
          number
          exhibitor {
            ...ExhibitorChip
            exhibits {
              ...ExhibitCard
            }
          }
        }
      }
    }
  `,
  [ExhibitorChip.fragment, ExhibitChip.fragment],
)

const GET_EXHIBITORS = graphql(`
  query GetExhibitors {
    getCurrentExhibition {
      id
      exhibitors {
        id
        user {
          id
          fullName
          nickname
        }
      }
    }
  }
`)

type TableInfo = {
  exhibitor: FragmentOf<typeof ExhibitorChip.fragment>
  exhibits: Array<FragmentOf<typeof ExhibitChip.fragment>>
}

// Add constants for chip widths
const EXHIBITOR_CHIP_WIDTH = 320 // w-80 = 20rem = 320px
const EXHIBIT_CHIP_WIDTH = 320 // w-80 = 20rem = 320px
const PANEL_PADDING = 40 // Account for panel padding and margins
const PANEL_WIDTH = Math.max(EXHIBITOR_CHIP_WIDTH, EXHIBIT_CHIP_WIDTH) + PANEL_PADDING

// Memoized SVG component to prevent re-renders
const MemoizedSVG = memo(
  ({
    onTableClick,
    onLoad,
    onError,
    exhibitionKey,
  }: {
    onTableClick: (tableNumber: number, event: React.MouseEvent<SVGSVGElement>) => void
    onLoad: (svg: SVGSVGElement) => void
    onError: (error: string) => void
    tables: Map<number, TableInfo>
    exhibitionKey: string
  }) => {
    const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
      const target = event.target as Element
      const tableEl = target.closest('[id^="table_"]')

      if (!tableEl || !tableEl.id) {
        // Clicked on SVG but not on a table
        return
      }

      const [match, number] = tableEl.id.match(/table_(\d+)/) || []
      if (!match) {
        console.debug(`click on a non-table element ${tableEl.id} ignored`)
        return
      }

      onTableClick(+number, event)
    }

    return (
      <ReactSVG
        src={`/api/exhibition/${exhibitionKey}/seatplan`}
        className="seating-plan-svg block h-auto w-full"
        onLoad={onLoad}
        onClick={handleClick}
        onError={onError}
      />
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if tables data or exhibition key changes
    return (
      prevProps.tables === nextProps.tables && prevProps.exhibitionKey === nextProps.exhibitionKey
    )
  },
)

export const SeatingPlan: React.FC = () => {
  const { data: tablesData } = useQuery(GET_TABLES)
  const { data: exhibitorsData } = useQuery(GET_EXHIBITORS)
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [tables, setTables] = useState<Map<number, TableInfo>>(new Map())
  const [svgLoadError, setSvgLoadError] = useState<string | null>(null)
  const [panelPosition, setPanelPosition] = useState<{
    top: number
    left?: number
    right?: number
    placement: 'left' | 'right'
  }>({ top: 0, placement: 'right' })
  const [lastClickEvent, setLastClickEvent] = useState<{
    clientX: number
    clientY: number
    target: Element | null
  } | null>(null)
  const { exhibitor } = useExhibitor()
  const { exhibition } = useExhibition()
  const isAdmin = exhibitor?.user.isAdministrator
  const exhibitionKey = exhibition?.key ?? 'cc2025'
  const svgRef = useRef<SVGSVGElement | null>(null)
  const stylingAppliedRef = useRef<boolean>(false)
  const tablesRef = useRef<Map<number, TableInfo>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Update the tables ref whenever tables state changes
  useEffect(() => {
    tablesRef.current = tables
  }, [tables])

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if no table is selected or if we're in measuring mode
      if (!selectedTable) return

      console.debug('Click outside handler triggered:', {
        target: event.target,
        targetClasses: (event.target as Element).classList?.toString(),
        targetId: (event.target as Element).id,
        targetTagName: (event.target as Element).tagName,
        eventPhase: event.eventPhase,
        bubbles: event.bubbles,
        composed: event.composed,
        timeStamp: event.timeStamp,
      })

      // Check if click is outside the panel and not on a table
      const target = event.target as Element

      // Check if click is on a table element
      let isClickOnTable = false
      const el = target.closest('[id^="table_"]')
      if (el && el.id && el.id.match(/table_(\d+)/)) {
        isClickOnTable = true
        console.debug('Click was on a table element:', el.id)
      }

      // Check if click is on the panel
      const isClickOnPanel = event.composedPath().some((el) => {
        const element = el as Element
        const hasPanelClass = element.classList && element.classList.contains('table-info-panel')
        console.debug('Checking element in path:', {
          element: element.tagName,
          classes: element.classList?.toString(),
          hasPanelClass,
          id: element.id,
        })
        return hasPanelClass
      })

      console.debug('Click analysis:', {
        isClickOnTable,
        isClickOnPanel,
        willClose: !isClickOnTable && !isClickOnPanel,
      })

      // Close the panel if click is not on a table or the panel
      if (!isClickOnTable && !isClickOnPanel) {
        console.debug('Closing panel due to click outside')
        setSelectedTable(null)
      }
    }

    document.addEventListener('click', handleClickOutside, true) // Use capture phase
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [selectedTable])

  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedTable) {
        console.debug('Closing panel due to Escape key')
        setSelectedTable(null)
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [selectedTable])

  // Handle table selection
  const handleTableSelection = useCallback(
    (tableNumber: number, event: React.MouseEvent<SVGSVGElement>) => {
      // Store click event information for later use
      setLastClickEvent({
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target as Element,
      })

      // Set the selected table immediately
      setSelectedTable(tableNumber)
    },
    [],
  )

  // Effect to position the panel
  useEffect(() => {
    if (selectedTable && panelRef.current && lastClickEvent) {
      // Get the actual size of the panel
      const panelRect = panelRef.current.getBoundingClientRect()
      const panelHeight = panelRect.height
      const panelWidth = PANEL_WIDTH

      // Now calculate the real position
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return

      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Get cursor position within the container
      const cursorY = lastClickEvent.clientY - containerRect.top

      // Calculate available space to the right and left of click point
      const clickX = lastClickEvent.clientX
      const clickY = lastClickEvent.clientY
      const spaceToRight = viewportWidth - clickX
      const spaceToLeft = clickX
      const spaceBelow = viewportHeight - clickY

      // Determine horizontal placement (left or right of cursor)
      const horizontalPlacement =
        spaceToRight >= panelWidth || spaceToRight >= spaceToLeft
          ? ('right' as const)
          : ('left' as const)

      // Determine vertical position
      let top: number

      // Check if there's enough space below the cursor for the panel
      if (spaceBelow >= panelHeight) {
        // Enough space below - position panel with top aligned with cursor
        top = cursorY - 20
      } else {
        // Not enough space below - position at bottom of visible area
        top = viewportHeight - panelHeight - 10 - containerRect.top // 10px margin from bottom
      }

      // Ensure the panel stays within the container bounds
      if (top < 0) {
        top = 5 // Add a small margin at the top
      }

      // Final safety check: if panel would go beyond the bottom of the container
      if (top + panelHeight > containerRect.height) {
        top = Math.max(0, containerRect.height - panelHeight - 5) // 5px margin at top and bottom
      }

      // Calculate horizontal position
      let position: {
        top: number
        left?: number
        right?: number
        placement: 'left' | 'right'
      }

      if (horizontalPlacement === 'right') {
        // Calculate position for right placement - based on cursor position
        const left = clickX - containerRect.left + 15 // 15px gap from cursor

        // Check if panel would go beyond the right edge
        if (left + panelWidth > containerRect.width) {
          // If there's not enough space on right, try placing on left instead
          if (clickX - panelWidth - 5 >= containerRect.left) {
            position = {
              top,
              right: viewportWidth - clickX + 15, // Add 15px gap from cursor when placing on left
              placement: 'left' as const,
            }
          } else {
            // If there's not enough space on either side, position it within bounds
            position = {
              top,
              left: Math.max(0, containerRect.width - panelWidth - 5),
              placement: 'right' as const,
            }
          }
        } else {
          position = {
            top,
            left,
            placement: horizontalPlacement,
          }
        }
      } else {
        // Calculate position for left placement - based on cursor position
        const right = viewportWidth - clickX + 15 // Add 15px gap from cursor when placing on left

        // Check if panel would go beyond the left edge
        if (clickX - panelWidth - 5 < containerRect.left) {
          // If there's not enough space on left, try placing on right instead
          if (clickX + panelWidth + 15 <= containerRect.right) {
            position = {
              top,
              left: clickX - containerRect.left + 15,
              placement: 'right' as const,
            }
          } else {
            // If there's not enough space on either side, position it within bounds
            position = {
              top,
              left: 5,
              placement: 'right' as const,
            }
          }
        } else {
          position = {
            top,
            right,
            placement: horizontalPlacement,
          }
        }
      }

      // Set the final position
      setPanelPosition(position)
    }
  }, [selectedTable, lastClickEvent])

  // Add tooltip to an SVG element
  const addTooltip = (element: Element, content: string) => {
    // Create tooltip element
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title')
    tooltip.textContent = content

    // Remove any existing tooltip
    const existingTooltip = element.querySelector('title')
    if (existingTooltip) {
      element.removeChild(existingTooltip)
    }

    // Add the new tooltip
    element.appendChild(tooltip)
  }

  const applyTableStyling = useCallback(() => {
    const renderedSvg = document.querySelector('.seating-plan-svg')
    if (!renderedSvg) {
      return
    }

    // Find all elements with an id matching table_\d
    const tableElements = renderedSvg.querySelectorAll('[id^="table_"]')

    tableElements.forEach((tableElement) => {
      const id = tableElement.id
      const match = id.match(/table_(\d+)/)
      if (!match) {
        return
      }

      const tableNumber = parseInt(match[1], 10)
      const tableInfo = tablesRef.current.get(tableNumber)

      // Clear existing classes first to ensure clean state
      tableElement.classList.remove('occupied')

      // Add clickable style to all tables
      tableElement.setAttribute('style', 'cursor: pointer;')

      if (tableInfo) {
        // Add occupied class to the table element
        tableElement.classList.add('occupied')

        // Create tooltip content
        const tooltipContent = `${getDisplayName(tableInfo.exhibitor.user)}\n${tableInfo.exhibits.map((exhibit) => exhibit.title).join('\n')}`
        addTooltip(tableElement, tooltipContent)
      } else {
        addTooltip(tableElement, 'Nicht belegt')
      }
    })

    stylingAppliedRef.current = true
  }, []) // Remove tables from dependencies, use tablesRef instead

  // Add an effect to reapply styling after any render
  useEffect(() => {
    // Short timeout to ensure DOM is updated
    const timer = setTimeout(() => {
      applyTableStyling()
    }, 50)

    return () => clearTimeout(timer)
  }, [applyTableStyling, selectedTable]) // Add selectedTable as dependency to trigger styling after selection

  // Process table data
  React.useEffect(() => {
    if (!tablesData) return

    const { tables: fetchedTables } = tablesData.getCurrentExhibition!
    const occupiedTablesMap = new Map(
      fetchedTables
        ?.filter((table) => table.exhibitor)
        .map((table) => [
          table.number,
          {
            exhibitor: table.exhibitor!,
            exhibits:
              table.exhibitor?.exhibits
                ?.filter((exhibit) => !exhibit.table || exhibit.table.number === table.number)
                ?.sort((a, b) => a.title.localeCompare(b.title)) ?? [],
          },
        ]),
    )

    setTables(occupiedTablesMap)

    // Reset styling flag and apply styling if SVG is already loaded
    stylingAppliedRef.current = false
    if (svgRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(applyTableStyling, 50)
    }
  }, [tablesData, applyTableStyling]) // Added applyTableStyling to dependencies

  // Handle SVG load event
  const handleSVGLoad = useCallback(
    (svg: SVGSVGElement) => {
      svgRef.current = svg

      // Apply styling immediately after SVG loads
      applyTableStyling()
    },
    [applyTableStyling],
  ) // Added applyTableStyling to dependencies

  // Handle SVG load error
  const handleSVGError = useCallback((error: string) => {
    setSvgLoadError(error)
  }, [])

  // Close the information panel
  const closeInfoPanel = useCallback(() => {
    console.debug('Closing panel via closeInfoPanel callback')
    setSelectedTable(null)
  }, [])

  if (!tablesData) {
    return <LoadInProgress />
  }

  const selectedTableInfo = selectedTable ? tables.get(selectedTable) : null

  return (
    <div className="relative mx-auto w-full max-w-[1600px] p-5" ref={containerRef}>
      <div className="relative h-auto w-full rounded border border-gray-300 bg-white shadow">
        {svgLoadError ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded border border-red-200 bg-red-50 p-5 text-center">
            <p className="my-2.5 text-red-700">Failed to load seating plan: {svgLoadError}</p>
            <p className="my-2.5 text-red-700">
              Please check that the SVG file is available at the correct location.
            </p>
            <button
              className="cursor-pointer rounded border-0 bg-blue-500 px-3 py-2 text-sm text-white transition-colors duration-300 hover:bg-blue-600"
              onClick={() => setSvgLoadError(null)}>
              Try Again
            </button>
          </div>
        ) : (
          <MemoizedSVG
            onTableClick={handleTableSelection}
            onLoad={handleSVGLoad}
            onError={handleSVGError}
            tables={tables}
            exhibitionKey={exhibitionKey}
          />
        )}
      </div>

      {/* Single panel instance */}
      {selectedTable && tablesData.getCurrentExhibition && (
        <TableInfoPanel
          selectedTable={selectedTable}
          tableInfo={selectedTableInfo || undefined}
          onClose={closeInfoPanel}
          position={panelPosition}
          measureRef={panelRef}
          isAdmin={isAdmin || false}
          exhibitors={exhibitorsData?.getCurrentExhibition?.exhibitors?.map((exhibitor) => ({
            id: exhibitor.id,
            user: {
              fullName: exhibitor.user.fullName,
              nickname: exhibitor.user.nickname || null,
            },
          }))}
          currentExhibitorId={exhibitor?.id}
          exhibitionId={tablesData.getCurrentExhibition.id.toString()}
        />
      )}
    </div>
  )
}

export default SeatingPlan
