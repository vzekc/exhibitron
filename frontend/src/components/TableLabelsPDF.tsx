import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from '@react-pdf/renderer'
import { graphql, ResultOf } from 'gql.tada'
import { ApolloClient } from '@apollo/client'
import QRCode from 'qrcode'

// Register fonts
Font.register({
  family: 'Lato',
  fonts: [{ src: '/fonts/Lato-Regular.ttf' }, { src: '/fonts/Lato-Bold.ttf', fontWeight: 'bold' }],
})

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

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 0,
    fontFamily: 'Lato',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    width: '80mm',
    height: '50mm',
    padding: '5mm',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  qrCodeContainer: {
    width: '40mm', // Same as QR code size
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCode: {
    width: '40mm', // Full height minus 2x5mm margin
    height: '40mm',
  },
  textContainer: {
    position: 'relative',
    width: '35mm', // Remaining width
    height: '40mm', // Match QR code height
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  eventName: {
    position: 'absolute',
    fontSize: 8,
    color: '#4a4a4a',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    // Position at right edge of label
    left: '35mm', // Move to right edge
    bottom: '-5mm', // Align with bottom
    // Rotate around bottom-left corner
    transform: 'rotate(-90deg)',
    transformOrigin: 'left bottom',
    //backgroundColor: '#eeeeff',  // Light blue background
    padding: '2mm',
    // Width becomes height after rotation - use full label height
    width: '50mm',
  },
  tableNumber: {
    position: 'absolute',
    fontSize: 80,
    fontWeight: 'bold',
    color: '#cc0000',
    textAlign: 'center',
    // Position before rotation - measured from left edge of textContainer
    left: '-2.5mm',
    top: '47mm', // Move down further
    // Rotate around top-left corner
    transform: 'rotate(-90deg)',
    transformOrigin: 'left top',
    // Width becomes height after rotation - use full label height
    width: '50mm',
    //backgroundColor: '#ffeeee',  // Light pink background
    paddingTop: '0mm',
    paddingBottom: '0mm',
    paddingLeft: '2mm',
    paddingRight: '2mm',
  },
})

const GET_TABLES = graphql(`
  query GetTables {
    getCurrentExhibition {
      id
      title
      tables {
        id
        number
      }
    }
  }
`)

type Exhibition = NonNullable<ResultOf<typeof GET_TABLES>['getCurrentExhibition']>

const generateQRCode = async (url: string): Promise<string> =>
  QRCode.toDataURL(url, {
    margin: 1,
    width: 300, // Increased QR code resolution
  })

interface TableLabelsPDFDocumentProps {
  exhibition: Exhibition
  tableNumbers: number[]
  qrCodes: Map<number, string>
  layoutConfig: LayoutConfig
  showBorders: boolean
}

const TableLabelsPDFDocument = ({
  exhibition,
  tableNumbers,
  qrCodes,
  layoutConfig,
  showBorders,
}: TableLabelsPDFDocumentProps) => {
  // Compute labels per page based on A4 dimensions (210mm × 297mm)
  const labelsPerPage =
    Math.floor((297 - layoutConfig.offset.top) / layoutConfig.grid.rowHeight) *
    Math.floor((210 - layoutConfig.offset.left) / layoutConfig.grid.columnWidth)

  const getLabelPosition = (index: number) => {
    const columnsPerPage = Math.floor(
      (210 - layoutConfig.offset.left) / layoutConfig.grid.columnWidth,
    )

    const col = index % columnsPerPage
    const row = Math.floor((index % labelsPerPage) / columnsPerPage)

    // Calculate x position from left edge
    const x = layoutConfig.offset.left + col * layoutConfig.grid.columnWidth

    // Calculate y position from top
    const y = layoutConfig.offset.top + row * layoutConfig.grid.rowHeight

    return {
      left: `${x}mm`,
      top: `${y}mm`,
    }
  }

  // Group labels into pages
  const pages = []
  for (let i = 0; i < tableNumbers.length; i += labelsPerPage) {
    const pageLabels = tableNumbers.slice(i, i + labelsPerPage)
    pages.push(pageLabels)
  }

  return (
    <Document>
      {pages.map((pageLabels, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {pageLabels.map((tableNumber, labelIndex) => (
            <View
              key={tableNumber}
              style={[
                styles.label,
                getLabelPosition(labelIndex),
                showBorders
                  ? {
                      borderTopWidth: 1,
                      borderRightWidth: 1,
                      borderBottomWidth: 1,
                      borderLeftWidth: 1,
                      borderColor: '#333333',
                      borderStyle: 'solid',
                    }
                  : {},
              ]}>
              <View style={styles.qrCodeContainer}>
                <Image src={qrCodes.get(tableNumber) || ''} style={styles.qrCode} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.tableNumber}>{tableNumber}</Text>
                <Text style={styles.eventName}>{exhibition.title}</Text>
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  )
}

interface GenerateTableLabelsParams {
  client: ApolloClient<object>
  tableNumbers?: number[]
  layoutConfig: LayoutConfig
  showBorders: boolean
}

export const generateAndDownloadTableLabels = async (
  params: GenerateTableLabelsParams,
): Promise<void> => {
  const { client, tableNumbers, layoutConfig, showBorders } = params

  const result = await client.query({
    query: GET_TABLES,
  })

  const exhibition = result.data.getCurrentExhibition

  if (!exhibition) {
    throw new Error('Exhibition not found')
  }

  // If no specific table numbers provided, use all tables and sort by number
  const tablesToPrint = tableNumbers
    ? tableNumbers.sort((a, b) => a - b)
    : exhibition.tables?.map((table) => table.number).sort((a, b) => a - b) || []

  // Generate QR codes for each table
  const qrCodes = new Map<number, string>()
  for (const tableNumber of tablesToPrint) {
    try {
      const url = `${window.location.origin}/table/${tableNumber}`
      const qrCode = await generateQRCode(url)
      qrCodes.set(tableNumber, qrCode)
    } catch (error) {
      console.error(`Failed to generate QR code for table ${tableNumber}:`, error)
    }
  }

  // Create the document element
  const pdfDocument = (
    <TableLabelsPDFDocument
      exhibition={exhibition}
      tableNumbers={tablesToPrint}
      qrCodes={qrCodes}
      layoutConfig={layoutConfig}
      showBorders={showBorders}
    />
  )

  try {
    // Generate the PDF blob
    const blob = await pdf(pdfDocument).toBlob()

    // Create URL for the blob
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  } catch (error) {
    console.error('Error during PDF generation:', error)
    throw error
  }
}
