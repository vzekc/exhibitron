import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'

// Register fonts
Font.register({
  family: 'PT Sans',
  fonts: [
    { src: '/fonts/PTSans-Regular.ttf' },
    { src: '/fonts/PTSans-Bold.ttf', fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'PT Sans',
  },
  header: {
    marginBottom: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 300,
    height: 80,
    objectFit: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4a4a4a',
    textAlign: 'center',
    marginBottom: 40,
  },
  text: {
    fontSize: 16,
    color: '#4a4a4a',
    lineHeight: 1.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 70,
  },
  qrCode: {
    width: 140,
    height: 140,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a4a4a',
    textAlign: 'center',
    marginTop: 80,
    marginBottom: 20,
  },
})

interface WelcomePDFDocumentProps {
  headerLogoBase64: string
  qrCodeHomeBase64: string
  qrCodeScheduleBase64: string
}

const WelcomePDFDocument = ({
  headerLogoBase64,
  qrCodeHomeBase64,
  qrCodeScheduleBase64,
}: WelcomePDFDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with CC Logo */}
        <View style={styles.header}>
          <Image style={styles.headerLogo} src={headerLogoBase64} />
        </View>

        {/* Welcome Title */}
        <Text style={styles.title}>Willkommen zur Classic Computing 2025 in Hof</Text>

        {/* Welcome Text */}
        <Text style={styles.text}>
          Der Verein zum Erhalt klassischer Computer e.V. heißt Sie herzlich willkommen! Scannen Sie
          diesen QR-Code, um zu unserem Online-Katalog zu gelangen:
        </Text>

        {/* QR Code for Home */}
        <View style={styles.qrCodeContainer}>
          <Image style={styles.qrCode} src={qrCodeHomeBase64} />
        </View>

        {/* Vorträge Text */}
        <Text style={styles.text}>
          Im Vortragsraum finden viele interessante Präsentationen. Scannen Sie diesen QR-Code, um
          das Vortragsprogramm abzurufen:
        </Text>

        {/* QR Code for Schedule */}
        <View style={styles.qrCodeContainer}>
          <Image style={styles.qrCode} src={qrCodeScheduleBase64} />
        </View>
      </Page>
    </Document>
  )
}

/**
 * Generate a QR code as a data URL
 * @param url The URL to encode in the QR code
 * @returns A promise that resolves to the QR code as a data URL
 */
const generateQRCode = async (url: string): Promise<string> =>
  QRCode.toDataURL(url, {
    margin: 1,
    width: 140,
  })

/**
 * Load an image and convert it to base64
 * @param imageUrl The URL of the image to load
 * @returns A promise that resolves to the base64 data URL
 */
const getImageDataViaCanvas = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const dataURL = canvas.toDataURL('image/png')
      resolve(dataURL)
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`))
    img.src = imageUrl
  })
}

/**
 * Generate and download the Welcome PDF
 * @returns A promise that resolves when the PDF is generated and downloaded
 */
export const generateAndDownloadWelcomePDF = async (): Promise<void> => {
  try {
    // Load images
    const headerLogoBase64 = await getImageDataViaCanvas(`${window.location.origin}/cc-logo.svg`)

    // Generate QR codes
    const qrCodeHomeBase64 = await generateQRCode(`${window.location.origin}/`)
    const qrCodeScheduleBase64 = await generateQRCode(`${window.location.origin}/schedule`)

    // Create the document element
    const pdfDocument = (
      <WelcomePDFDocument
        headerLogoBase64={headerLogoBase64}
        qrCodeHomeBase64={qrCodeHomeBase64}
        qrCodeScheduleBase64={qrCodeScheduleBase64}
      />
    )

    // Generate the PDF blob
    const blob = await pdf(pdfDocument).toBlob()

    // Create URL for the blob
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  } catch (error) {
    console.error('Error generating Welcome PDF:', error)
    throw error
  }
}
