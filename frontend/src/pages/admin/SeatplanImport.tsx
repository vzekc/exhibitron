import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import Card from '@components/Card'
import Button from '@components/Button'
import { useExhibition } from '@contexts/ExhibitionContext'

interface OccupiedTable {
  number: number
  exhibitor: string
  exhibitCount: number
}

interface AnalysisResult {
  token: string
  tablesInSvg: number[]
  tablesInDb: number[]
  tablesToCreate: number[]
  tablesToDelete: number[]
  occupiedTablesToDelete: OccupiedTable[]
}

type Step = 'upload' | 'analysis' | 'importing' | 'done'

const SeatplanImport = () => {
  const { exhibition } = useExhibition()
  const exhibitionKey = exhibition?.key ?? ''
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  const analyzeFile = useCallback(
    async (file: File) => {
      setIsAnalyzing(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await axios.post<AnalysisResult>(
          `/api/exhibition/${exhibitionKey}/seatplan/analyze`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )

        setAnalysis(response.data)
        setStep('analysis')
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || err.message)
        } else {
          setError('Unbekannter Fehler bei der Analyse')
        }
      } finally {
        setIsAnalyzing(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [exhibitionKey],
  )

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0]
    if (file) analyzeFile(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) analyzeFile(file)
    },
    [analyzeFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleImport = async () => {
    if (!analysis) return

    setStep('importing')
    setError(null)

    try {
      await axios.post(`/api/exhibition/${exhibitionKey}/seatplan/import`, {
        token: analysis.token,
        createTables: analysis.tablesToCreate,
        deleteTables: analysis.tablesToDelete,
      })
      setStep('done')
    } catch (err) {
      setStep('analysis')
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message)
      } else {
        setError('Unbekannter Fehler beim Import')
      }
    }
  }

  const reset = () => {
    setStep('upload')
    setAnalysis(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Tischplan importieren</h1>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {step === 'upload' && (
        <Card>
          <p className="mb-4 text-gray-600">
            Lade eine LibreOffice-Draw-Datei (.odg) hoch. Die enthaltenen Tische werden mit der
            Datenbank abgeglichen.
          </p>
          <div
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            } ${isAnalyzing ? 'pointer-events-none opacity-60' : ''}`}>
            {isAnalyzing ? (
              <p className="text-gray-500">Analysiere...</p>
            ) : (
              <>
                <svg
                  className="mb-3 h-10 w-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="text-gray-600">ODG-Datei hierher ziehen oder klicken</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".odg"
            onChange={handleFileChange}
            className="absolute -left-[9999px]"
            tabIndex={-1}
          />
        </Card>
      )}

      {step === 'analysis' && analysis && (
        <>
          <Card className="mb-4">
            <h2 className="mb-4 text-lg font-semibold">Analyse-Ergebnis</h2>

            <div className="mb-4">
              <h3 className="mb-1 font-medium">Tische in der hochgeladenen Datei</h3>
              <p className="text-gray-600">{analysis.tablesInSvg.join(', ')}</p>
            </div>

            <div className="mb-4">
              <h3 className="mb-1 font-medium">Tische in der Datenbank</h3>
              <p className="text-gray-600">
                {analysis.tablesInDb.length > 0
                  ? analysis.tablesInDb.join(', ')
                  : 'Keine Tische vorhanden'}
              </p>
            </div>
          </Card>

          {analysis.tablesToCreate.length > 0 && (
            <Card className="mb-4">
              <h2 className="mb-3 text-lg font-semibold text-green-700">Neue Tische anlegen</h2>
              <p className="text-gray-600">{analysis.tablesToCreate.join(', ')}</p>
            </Card>
          )}

          {analysis.tablesToDelete.length > 0 && (
            <Card className="mb-4">
              <h2 className="mb-3 text-lg font-semibold text-red-700">Tische entfernen</h2>
              <p className="mb-2 text-gray-600">{analysis.tablesToDelete.join(', ')}</p>
              {analysis.occupiedTablesToDelete.length > 0 && (
                <div className="mt-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="mb-1 font-medium">Belegte Tische:</p>
                  <ul className="list-inside list-disc">
                    {analysis.occupiedTablesToDelete.map((t) => (
                      <li key={t.number}>
                        Tisch {t.number}: {t.exhibitor} ({t.exhibitCount} Exponat
                        {t.exhibitCount !== 1 ? 'e' : ''})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={handleImport}>Importieren</Button>
            <Button variant="secondary" onClick={reset}>
              Abbrechen
            </Button>
          </div>
        </>
      )}

      {step === 'importing' && (
        <Card>
          <p className="text-gray-600">Import wird durchgeführt...</p>
        </Card>
      )}

      {step === 'done' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-green-700">Import erfolgreich</h2>
          <p className="text-gray-600">Der Tischplan wurde erfolgreich importiert.</p>
        </Card>
      )}
    </div>
  )
}

export default SeatplanImport
