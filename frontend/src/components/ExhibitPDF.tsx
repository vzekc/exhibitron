import { useState, useEffect } from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  pdf,
} from '@react-pdf/renderer'
import { graphql } from 'gql.tada'
import { ApolloClient } from '@apollo/client'

// Register fonts (assuming you have Lato fonts in your public directory)
Font.register({
  family: 'Lato',
  fonts: [{ src: '/fonts/Lato-Regular.ttf' }, { src: '/fonts/Lato-Bold.ttf', fontWeight: 'bold' }],
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    padding: 30,
    fontFamily: 'Lato',
  },
  header: {
    marginBottom: 20,
    position: 'relative',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  logo: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 50,
    objectFit: 'contain',
  },
  titleSection: {
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4a4a4a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#8B0000', // dark red like in the screenshot
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#4a4a4a',
    marginBottom: 5,
  },
  contentRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  imageContainer: {
    width: '40%',
    marginRight: '5%',
  },
  image: {
    maxWidth: '100%',
    maxHeight: 300,
    objectFit: 'contain',
  },
  attributesContainer: {
    width: '55%',
  },
  attributeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  attributeLabel: {
    width: '40%',
    fontWeight: 'bold',
    fontSize: 12,
  },
  attributeValue: {
    width: '60%',
    fontSize: 12,
  },
  textContent: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 20,
    fontSize: 10,
    color: '#666',
    borderTop: '1pt solid #ddd',
    paddingTop: 10,
  },
  border: {
    border: '1pt solid #000',
    padding: 10,
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

// Function to load image via Canvas for better compatibility
const getImageDataViaCanvas = async (url: string): Promise<string> => {
  try {
    return new Promise<string>((resolve, reject) => {
      const img = document.createElement('img')
      img.crossOrigin = 'Anonymous'

      img.onload = () => {
        try {
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
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  } catch (error) {
    console.error('Error loading image via canvas:', error)
    return ''
  }
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
  logoBase64,
}: {
  exhibit: any
  mainImageBase64: string
  logoBase64: string
}) => {
  const attributes = exhibit.attributes || []
  const hasMainImage = mainImageBase64 !== '' && mainImageBase64.startsWith('data:')
  const hasLogo = logoBase64 !== '' && logoBase64.startsWith('data:')
  const exhibitorName = exhibit.exhibitor?.user?.fullName || ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {hasLogo && <Image src={logoBase64} style={styles.logo} />}
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>{exhibit.title}</Text>
          {exhibitorName && <Text style={styles.subtitle}>{exhibitorName}</Text>}
        </View>

        <View style={styles.contentRow}>
          {hasMainImage && (
            <View style={styles.imageContainer}>
              <Image src={mainImageBase64} style={styles.image} />
            </View>
          )}

          {attributes.length > 0 && (
            <View style={styles.attributesContainer}>
              {attributes.map((attr: any, index: number) => (
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
      </Page>
    </Document>
  )
}

/**
 * Generate and download a PDF for an exhibit
 * @param id The exhibit ID
 * @param client The Apollo client instance
 * @returns A promise that resolves when the PDF is generated and downloaded
 */
export const generateAndDownloadPDF = async (id: number, client: ApolloClient<any>): Promise<void> => {
  try {
    // Fetch exhibit data
    const result = await client.query({
      query: GET_EXHIBIT,
      variables: { id },
    })

    if (!result.data?.getExhibit) {
      throw new Error('Exhibit not found')
    }

    const exhibit = result.data.getExhibit

    // Generate file name
    const fileName = `${exhibit.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`

    // Load images if needed
    let mainImageBase64 = ''
    let logoBase64 = ''

    // Main image
    if (exhibit.mainImage) {
      try {
        const imageUrl = `/api/exhibit/${id}/image/main`
        const fullUrl = imageUrl.startsWith('/')
          ? `${window.location.origin}${imageUrl}`
          : imageUrl
        mainImageBase64 = await getImageDataViaCanvas(fullUrl)
      } catch (error) {
        console.error('Error fetching main image:', error)
      }
    }

    // Logo
    try {
      const logoUrl = '/vzekc-logo-transparent-border.png'
      const fullUrl = logoUrl.startsWith('/') ? `${window.location.origin}${logoUrl}` : logoUrl
      logoBase64 = await getImageDataViaCanvas(fullUrl)
    } catch (error) {
      console.warn('Could not load logo:', error)
    }

    // Create the document element
    const pdfDocument = (
      <ExhibitPDFDocument
        exhibit={exhibit}
        mainImageBase64={mainImageBase64}
        logoBase64={logoBase64}
      />
    )

    // Generate the PDF blob
    const blob = await pdf(pdfDocument).toBlob()

    // Create URL and trigger download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}
