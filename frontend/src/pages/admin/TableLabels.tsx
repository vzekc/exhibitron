import { useState, FormEvent } from 'react'
import { useApolloClient } from '@apollo/client'
import { generateAndDownloadTableLabels } from '@components/TableLabelsPDF'
import Card from '@components/Card'
import Button from '@components/Button'

interface LayoutConfig {
  // Label dimensions
  label: {
    width: number // Width of each label in mm
    height: number // Height of each label in mm
  }
  // Grid spacing
  grid: {
    rowHeight: number // Height of each row in mm
    columnWidth: number // Width of each column in mm
  }
  // Page margins/offsets
  offset: {
    top: number // Distance from top of page to first row in mm
    left: number // Distance from left edge to first column in mm
  }
}

const LABEL_PARAMETER_SETS: Record<string, LayoutConfig> = {
  'Avery Zweckform 80x50': {
    label: {
      width: 80, // Width of each label in mm
      height: 50, // Height of each label in mm
    },
    grid: {
      rowHeight: 55, // Height of each row in mm (including spacing)
      columnWidth: 95, // Width of each column in mm (including spacing)
    },
    offset: {
      top: 13, // Distance from top of page to first row in mm
      left: 17, // Distance from left edge to first column in mm
    },
  },
} as const

type LabelParameterSet = keyof typeof LABEL_PARAMETER_SETS

const TableLabels = () => {
  const client = useApolloClient()
  const [tableSpec, setTableSpec] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [selectedParameterSet, setSelectedParameterSet] =
    useState<LabelParameterSet>('Avery Zweckform 80x50')
  const [showBorders, setShowBorders] = useState(false)

  const parseTableSpec = (spec: string): number[] | undefined => {
    if (!spec.trim()) return undefined

    const tables = new Set<number>()

    // Split by comma and process each part
    spec.split(',').forEach((part) => {
      part = part.trim()
      if (!part) return

      // Check for range (e.g., "5-8")
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n.trim()))
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            tables.add(i)
          }
        }
      } else {
        // Single number
        const num = parseInt(part)
        if (!isNaN(num)) {
          tables.add(num)
        }
      }
    })

    return Array.from(tables).sort((a, b) => a - b)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsPrinting(true)
    try {
      const tableNumbers = parseTableSpec(tableSpec)
      await generateAndDownloadTableLabels({
        client,
        tableNumbers,
        layoutConfig: LABEL_PARAMETER_SETS[selectedParameterSet],
        showBorders,
      })
    } catch (error) {
      console.error('Failed to generate table labels:', error)
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Tisch-Labels drucken</h1>

      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-lg font-semibold">Label-Parameter</h2>
            <p className="mb-4 text-sm text-gray-600">
              Wähle die Label-Parameter für den Druck aus.
            </p>
            <select
              value={selectedParameterSet}
              onChange={(e) => setSelectedParameterSet(e.target.value as LabelParameterSet)}
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              disabled={isPrinting}>
              {Object.keys(LABEL_PARAMETER_SETS).map((set) => (
                <option key={set} value={set}>
                  {set}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showBorders"
                checked={showBorders}
                onChange={(e) => setShowBorders(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isPrinting}
              />
              <label htmlFor="showBorders" className="text-sm text-gray-600">
                Rahmen um die Labels anzeigen
              </label>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Tische auswählen</h2>
            <p className="mb-4 text-sm text-gray-600">
              Gebe die Tischnummern ein. Mehrere Tische können durch Kommas getrennt werden,
              Bereiche durch Bindestriche (z.B. "1,2,5-8,22"). Leer lassen für alle Tische.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <input
                type="text"
                value={tableSpec}
                onChange={(e) => setTableSpec(e.target.value)}
                placeholder="z.B. 1,2,5-8,22 oder leer lassen für alle Tische"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                disabled={isPrinting}
              />
              <Button
                type="submit"
                disabled={isPrinting}
                className="bg-green-600 hover:bg-green-700">
                Labels erzeugen
              </Button>
            </form>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Information</h2>
            <p className="text-gray-600">Die Labels werden im A4-Format gedruckt und enthalten:</p>
            <ul className="mt-2 list-inside list-disc text-gray-600">
              <li>QR-Code für den Tisch</li>
              <li>Name der Ausstellung</li>
              <li>Tischnummer</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default TableLabels
