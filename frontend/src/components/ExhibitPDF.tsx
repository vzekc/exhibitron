import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer'
import { graphql, ResultOf } from 'gql.tada'
import { ApolloClient } from '@apollo/client'
import QRCode from 'qrcode'

// Register fonts (assuming you have Lato fonts in your public directory)
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
    marginBottom: 15,
    position: 'relative',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerLogo: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 225,
    height: 60,
    objectFit: 'contain',
  },
  titleSection: {
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 36,
    color: '#4a4a4a',
  },
  subtitle: {
    fontSize: 20,
    color: '#cc0000',
    marginBottom: 15,
  },
  introText: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 20,
  },
  contentRow: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 20,
  },
  imageContainer: {
    width: '40%',
    marginRight: '5%',
  },
  image: {
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  },
  attributesContainer: {
    width: '55%',
    border: '1pt solid #000000',
    padding: 10,
  },
  attributeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  attributeLabel: {
    width: '40%',
    fontSize: 12,
    color: '#4a4a4a',
  },
  attributeValue: {
    width: '60%',
    fontSize: 12,
    color: '#4a4a4a',
  },
  textContent: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#4a4a4a',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLogo: {
    width: 92,
    height: 92,
    objectFit: 'contain',
  },
  exhibitorName: {
    fontSize: 32,
    color: '#cc0000',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  qrCode: {
    width: 80,
    height: 80,
  },
})

const GET_EXHIBIT = graphql(`
  query GetExhibit($id: Int!) {
    getExhibit(id: $id) {
      id
      title
      text
      exhibitor {
        id
        user {
          id
          fullName
        }
      }
      table {
        number
      }
      attributes {
        name
        value
      }
      mainImage
    }
  }
`)

type Exhibit = NonNullable<ResultOf<typeof GET_EXHIBIT>['getExhibit']>

const getImageDataViaCanvas = async (url: string): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const img = document.createElement('img')
    img.crossOrigin = 'Anonymous'

    img.onload = () => {
      // Create canvas element
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      // Draw image to canvas
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)

      // Get data URL
      const dataURL = canvas.toDataURL('image/png')
      resolve(dataURL)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

// Function to strip HTML tags from text for PDF
const stripHtml = (html: string) => {
  if (!html) return ''

  // Convert common HTML entities to their character equivalents
  const decodedHtml = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Replace bullet points and list items with dashes
  const withBullets = decodedHtml
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol>/g, '\n')
    .replace(/<\/ol>/g, '\n')

  // Replace paragraph breaks with newlines
  const withParagraphs = withBullets
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n')

  // Replace headers with uppercase text
  const withHeadings = withParagraphs.replace(/<h[1-6]>/g, '\n').replace(/<\/h[1-6]>/g, '\n\n')

  // Remove all remaining HTML tags
  const plainText = withHeadings.replace(/<[^>]*>?/gm, '')

  // Remove extra newlines and whitespace
  return plainText.replace(/\n{3,}/g, '\n\n').trim()
}

// Create the PDF Document component
const ExhibitPDFDocument = ({
  exhibit,
  mainImageBase64,
  headerLogoBase64,
  footerLogoBase64,
  qrCodeBase64,
}: {
  exhibit: Exhibit
  mainImageBase64: string
  headerLogoBase64: string
  footerLogoBase64: string
  qrCodeBase64?: string
}) => {
  const attributes = exhibit.attributes || []
  const hasMainImage = mainImageBase64 !== '' && mainImageBase64.startsWith('data:')
  const hasQrCode =
    qrCodeBase64 !== undefined && qrCodeBase64 !== '' && qrCodeBase64.startsWith('data:')
  const exhibitorName = exhibit.exhibitor?.user?.fullName || ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={headerLogoBase64} style={styles.headerLogo} />
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>{exhibit.title}</Text>
        </View>

        <View style={styles.contentRow}>
          {hasMainImage && (
            <View style={styles.imageContainer}>
              <Image src={mainImageBase64} style={styles.image} />
            </View>
          )}

          {attributes.length > 0 && (
            <View style={styles.attributesContainer}>
              {attributes.map((attr, index) => (
                <View key={index} style={styles.attributeRow}>
                  <Text style={styles.attributeLabel}>{attr.name}:</Text>
                  <Text style={styles.attributeValue}>{attr.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.textContent}>
          <Text>{stripHtml(exhibit.text || '')}</Text>
        </View>

        <View style={styles.footer}>
          <Image src={footerLogoBase64} style={styles.footerLogo} />
          {exhibitorName && <Text style={styles.exhibitorName}>{exhibitorName}</Text>}
          {hasQrCode && <Image src={qrCodeBase64} style={styles.qrCode} />}
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
    width: 200,
  })

/**
 * Parameters for generating and downloading a PDF
 */
export interface GeneratePDFParams {
  /** The exhibit ID */
  id: number
  /** The Apollo client instance */
  client: ApolloClient<object>
  /** Whether to display the PDF in the current window instead of downloading */
  displayInWindow?: boolean
  /** Optional URL to include as a QR code in the PDF */
  url?: string
}

/**
 * Generate and download a PDF for an exhibit
 * @param params Configuration parameters
 * @returns A promise that resolves when the PDF is generated and downloaded
 */
export const generateAndDownloadPDF = async (params: GeneratePDFParams): Promise<void> => {
  const { id, client, displayInWindow = false, url: qrUrl } = params

  const result = await client.query({
    query: GET_EXHIBIT,
    variables: { id },
  })

  const exhibit = result.data.getExhibit

  if (!exhibit) {
    throw new Error('Exhibit not found')
  }

  // Generate file name
  const fileName = `${exhibit.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`

  // Load images
  let mainImageBase64 = ''
  let headerLogoBase64 = ''
  let footerLogoBase64 = ''
  let qrCodeBase64 = ''

  // Load logos
  const headerLogoUrl = '/cc-logo.svg'
  const footerLogoUrl = '/vzekc-logo.svg'

  const fullHeaderLogoUrl = headerLogoUrl.startsWith('/')
    ? `${window.location.origin}${headerLogoUrl}`
    : headerLogoUrl
  const fullFooterLogoUrl = footerLogoUrl.startsWith('/')
    ? `${window.location.origin}${footerLogoUrl}`
    : footerLogoUrl

  try {
    headerLogoBase64 = await getImageDataViaCanvas(fullHeaderLogoUrl)
    footerLogoBase64 = await getImageDataViaCanvas(fullFooterLogoUrl)
  } catch (error) {
    console.error('Failed to load logos:', error)
  }

  // Main image
  if (exhibit.mainImage) {
    const imageUrl = `/api/exhibit/${id}/image/main`
    const fullUrl = imageUrl.startsWith('/') ? `${window.location.origin}${imageUrl}` : imageUrl
    try {
      mainImageBase64 = await getImageDataViaCanvas(fullUrl)
    } catch (error) {
      console.error('Failed to load main image:', error)
    }
  }

  // Generate QR code if URL is provided
  if (qrUrl) {
    try {
      qrCodeBase64 = await generateQRCode(qrUrl)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }

  // Create the document element
  const pdfDocument = (
    <ExhibitPDFDocument
      exhibit={exhibit}
      mainImageBase64={mainImageBase64}
      headerLogoBase64={headerLogoBase64}
      footerLogoBase64={footerLogoBase64}
      qrCodeBase64={qrCodeBase64}
    />
  )

  // Generate the PDF blob
  const blob = await pdf(pdfDocument).toBlob()

  // Create URL for the blob
  const blobUrl = URL.createObjectURL(blob)

  if (displayInWindow) {
    // Open in the current window
    window.open(blobUrl, '_blank')
  } else {
    // Trigger download
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    }, 100)
  }
}
