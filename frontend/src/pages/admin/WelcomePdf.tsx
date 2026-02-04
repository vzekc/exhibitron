import { useState } from 'react'
import { generateAndDownloadWelcomePDF } from '@components/WelcomePDF'
import Card from '@components/Card'
import Button from '@components/Button'
import { useExhibition } from '@contexts/ExhibitionContext.ts'

const WelcomePdf = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const { exhibition } = useExhibition()
  const exhibitionTitle = exhibition?.title ?? 'Classic Computing'
  const exhibitionLocation = exhibition?.location ?? ''

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      await generateAndDownloadWelcomePDF(exhibitionTitle, exhibitionLocation)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Fehler beim Generieren des PDFs. Bitte versuchen Sie es erneut.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Willkommens-PDF generieren</h1>

      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-lg font-semibold">PDF-Generierung</h2>
            <p className="mb-4 text-sm text-gray-600">
              Der "Willkommen" Aufsteller ist ein PDF-Dokument, das als Begrüßung für die Besucher
              der {exhibitionTitle} {exhibitionLocation} dient. Es enthält wichtige Informationen
              und QR-Codes, die den Gästen helfen, sich zurechtzufinden und auf den Online-Katalog
              sowie den Zeitplan zuzugreifen.
            </p>
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700">
              {isGenerating ? 'PDF wird generiert...' : 'Willkommens-PDF generieren'}
            </Button>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">PDF-Inhalt</h2>
            <p className="text-gray-600">Das PDF wird im A4-Format erstellt und enthält:</p>
            <ul className="mt-2 list-inside list-disc text-gray-600">
              <li>CC-Logo (groß) oben</li>
              <li>
                Willkommenstitel "Willkommen zur {exhibitionTitle} {exhibitionLocation}"
              </li>
              <li>Willkommenstext mit QR-Code zum Online-Katalog</li>
              <li>QR-Code für die Startseite (/)</li>
              <li>Vorträge-Sektion mit QR-Code zum Zeitplan</li>
              <li>QR-Code für den Zeitplan (/schedule)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default WelcomePdf
