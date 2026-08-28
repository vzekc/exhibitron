import {
  Document,
  DocumentProps,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  pdf,
} from '@react-pdf/renderer'
import { Fragment } from 'react'
import QRCode from 'qrcode'
import { loadImageData } from '@utils/imageData.ts'
import {
  NAME_BOX,
  NAME_TAG,
  NameTagExhibition,
  NameTagExhibitor,
  getNameFontSize,
  getNameTagName,
  getNameTagNickname,
  getNameTagUrl,
  mmToPt,
} from './nameTag.ts'

Font.register({
  family: 'Lato',
  fonts: [{ src: '/fonts/Lato-Regular.ttf' }, { src: '/fonts/Lato-Bold.ttf', fontWeight: 'bold' }],
})

// Tags are tiled edge to edge so that one cut separates two neighbours.  Nothing is
// drawn on the tags themselves -- the cutting guides are hairline marks out in the page
// margin, pointing at each cut line, so no ink survives on a trimmed tag.
const SHEET = {
  page: { width: 210, height: 297 }, // A4, mm
  cropMark: {
    length: 4, // how far the mark reaches into the margin, mm
    offset: 1, // gap between the block of tags and the mark, mm
    thickness: 0.2,
  },
} as const

const sheetGrid = () => {
  const { page, cropMark } = SHEET
  const margin = cropMark.offset + cropMark.length
  const columns = Math.floor((page.width - 2 * margin) / NAME_TAG.width)
  const rows = Math.floor((page.height - 2 * margin) / NAME_TAG.height)
  return {
    columns,
    rows,
    perPage: columns * rows,
    // Centre the block so the marks get equal room on both sides.
    left: (page.width - columns * NAME_TAG.width) / 2,
    top: (page.height - rows * NAME_TAG.height) / 2,
  }
}

export const nameTagsPerPage = sheetGrid().perPage

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#ffffff',
    padding: 0,
    fontFamily: 'Lato',
    position: 'relative',
  },
  // The logo and the title flow across the top; the name and the QR code are anchored to
  // the bottom corners, so the tall logo and the QR code can share the same band of
  // height without colliding.  No padding here -- the corner offsets carry it, and a
  // padded box would make the absolute offsets ambiguous.
  tag: {
    width: `${NAME_TAG.width}mm`,
    height: `${NAME_TAG.height}mm`,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    fontFamily: 'Lato',
    color: '#111827',
  },
  positioned: {
    position: 'absolute',
  },
  cropMark: {
    position: 'absolute',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: `${NAME_TAG.padding}mm`,
    marginLeft: `${NAME_TAG.padding}mm`,
    marginRight: `${NAME_TAG.padding}mm`,
  },
  // Spans the width the logo leaves, so both lines right-align on the header's right
  // margin -- the same margin the QR code sits on.  Without a definite width the block
  // shrink-wraps the longer line and the shorter one has nothing to align against.
  headerText: {
    flex: 1,
  },
  exhibitionTitle: {
    fontSize: NAME_TAG.titleFontSize,
    fontWeight: 'bold',
    color: '#4a4a4a',
    textAlign: 'right',
  },
  venue: {
    fontSize: NAME_TAG.titleFontSize,
    color: '#4a4a4a',
    textAlign: 'right',
  },
  qrCode: {
    position: 'absolute',
    right: `${NAME_TAG.padding}mm`,
    bottom: `${NAME_TAG.padding}mm`,
    width: `${NAME_TAG.qrSize}mm`,
    height: `${NAME_TAG.qrSize}mm`,
  },
  names: {
    position: 'absolute',
    left: `${NAME_TAG.padding}mm`,
    bottom: `${NAME_TAG.padding}mm`,
    width: `${NAME_BOX.width}mm`,
    // getNameFontSize should have sized the name to fit; clip as a backstop so a name can
    // never run into the QR code and make it unscannable.
    overflow: 'hidden',
  },
  name: {
    fontWeight: 'bold',
  },
  nickname: {
    fontSize: NAME_TAG.nicknameFontSize,
    color: '#4a4a4a',
  },
})

interface RenderedTag {
  name: string
  nickname: string | null
  qrCode: string
}

interface Logo {
  dataUrl: string
  width: string
}

interface NameTagProps {
  tag: RenderedTag
  exhibition: NameTagExhibition
  logo: Logo
  position?: { left: string; top: string }
}

const NameTag = ({ tag, exhibition, logo, position }: NameTagProps) => (
  <View style={[styles.tag, ...(position ? [styles.positioned, position] : [])]}>
    <View style={styles.header}>
      <Image src={logo.dataUrl} style={{ height: `${NAME_TAG.logoHeight}mm`, width: logo.width }} />
      <View style={styles.headerText}>
        <Text style={styles.exhibitionTitle}>{exhibition.title}</Text>
        {exhibition.venue && <Text style={styles.venue}>{exhibition.venue}</Text>}
      </View>
    </View>
    <View style={styles.names}>
      <Text
        // Wrap at spaces only.  react-pdf otherwise fills the line greedily and would
        // rather hyphenate ("Maximilian Schel-/lenberg") than start a new word on a new
        // line.  CSS does not auto-hyphenate, so this also keeps the preview honest.
        hyphenationCallback={(word) => [word]}
        style={[styles.name, { fontSize: getNameFontSize(tag.name, !!tag.nickname) }]}>
        {tag.name}
      </Text>
      {tag.nickname && <Text style={styles.nickname}>{tag.nickname}</Text>}
    </View>
    <Image src={tag.qrCode} style={styles.qrCode} />
  </View>
)

const renderTags = async (exhibitors: NameTagExhibitor[]): Promise<RenderedTag[]> =>
  Promise.all(
    exhibitors.map(async (exhibitor) => ({
      name: getNameTagName(exhibitor),
      nickname: getNameTagNickname(exhibitor),
      qrCode: await QRCode.toDataURL(getNameTagUrl(exhibitor.id), { margin: 0, width: 300 }),
    })),
  )

const loadLogo = async (): Promise<Logo> => {
  const { dataUrl, width, height } = await loadImageData(`${window.location.origin}/vzekc-logo.svg`)
  return { dataUrl, width: `${(NAME_TAG.logoHeight * width) / height}mm` }
}

const openPdf = async (document: React.ReactElement<DocumentProps>) => {
  const blob = await pdf(document).toBlob()
  window.open(URL.createObjectURL(blob), '_blank')
}

interface SingleNameTagParams {
  exhibitor: NameTagExhibitor
  exhibition: NameTagExhibition
}

// A single tag on a page cut to the tag itself, for exhibitors printing their own.
export const generateAndDownloadNameTag = async ({
  exhibitor,
  exhibition,
}: SingleNameTagParams): Promise<void> => {
  const [tag] = await renderTags([exhibitor])
  const logo = await loadLogo()

  await openPdf(
    <Document>
      <Page size={{ width: mmToPt(NAME_TAG.width), height: mmToPt(NAME_TAG.height) }}>
        <NameTag tag={tag} exhibition={exhibition} logo={logo} />
      </Page>
    </Document>,
  )
}

interface NameTagSheetParams {
  exhibitors: NameTagExhibitor[]
  exhibition: NameTagExhibition
}

const Mark = ({ left, top, width, height }: Record<string, number>) => (
  <View
    style={[
      styles.cropMark,
      { left: `${left}mm`, top: `${top}mm`, width: `${width}mm`, height: `${height}mm` },
    ]}
  />
)

// Ticks in the margin pointing at every cut line, so a knife guided by a ruler laid
// across two opposite marks trims exactly on the tag edge.
const CropMarks = ({ rows }: { rows: number }) => {
  const { columns, left, top } = sheetGrid()
  const { length, offset, thickness } = SHEET.cropMark
  const right = left + columns * NAME_TAG.width
  const bottom = top + rows * NAME_TAG.height

  return (
    <>
      {Array.from({ length: columns + 1 }, (_, column) => {
        const x = left + column * NAME_TAG.width - thickness / 2
        return (
          <Fragment key={`column-${column}`}>
            <Mark left={x} top={top - offset - length} width={thickness} height={length} />
            <Mark left={x} top={bottom + offset} width={thickness} height={length} />
          </Fragment>
        )
      })}
      {Array.from({ length: rows + 1 }, (_, row) => {
        const y = top + row * NAME_TAG.height - thickness / 2
        return (
          <Fragment key={`row-${row}`}>
            <Mark left={left - offset - length} top={y} width={length} height={thickness} />
            <Mark left={right + offset} top={y} width={length} height={thickness} />
          </Fragment>
        )
      })}
    </>
  )
}

interface NameTagSheetDocumentProps extends Omit<NameTagSheetParams, 'exhibitors'> {
  tags: RenderedTag[]
  logo: Logo
}

const NameTagSheetDocument = ({ tags, exhibition, logo }: NameTagSheetDocumentProps) => {
  const { columns, left, top, perPage } = sheetGrid()

  const pages = []
  for (let i = 0; i < tags.length; i += perPage) {
    pages.push(tags.slice(i, i + perPage))
  }

  return (
    <Document>
      {pages.map((pageTags, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.sheet}>
          {/* Only mark the rows this page actually fills. */}
          <CropMarks rows={Math.ceil(pageTags.length / columns)} />
          {pageTags.map((tag, tagIndex) => (
            <NameTag
              key={tagIndex}
              tag={tag}
              exhibition={exhibition}
              logo={logo}
              position={{
                left: `${left + (tagIndex % columns) * NAME_TAG.width}mm`,
                top: `${top + Math.floor(tagIndex / columns) * NAME_TAG.height}mm`,
              }}
            />
          ))}
        </Page>
      ))}
    </Document>
  )
}

// A4 sheets of tags for the organisers to print in bulk.
export const generateAndDownloadNameTagSheet = async ({
  exhibitors,
  exhibition,
}: NameTagSheetParams): Promise<void> => {
  const tags = await renderTags(exhibitors)
  const logo = await loadLogo()

  await openPdf(<NameTagSheetDocument tags={tags} exhibition={exhibition} logo={logo} />)
}
