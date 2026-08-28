// Geometry and text rules for the exhibitor name tag.  The on-screen preview
// (NameTagPreview) and the printed tag (NameTagPDF) both derive from this, so changing
// the format here changes both.  Lengths are millimetres, font sizes are points.

// `padding` is the uniform margin around everything on the tag: the logo is inset by it
// at the top and left, the QR code at the right and bottom.
export const NAME_TAG = {
  width: 88,
  height: 54,
  padding: 3.5,
  logoHeight: 17.5,
  qrSize: 24,
  gap: 3.5,
  nicknameFontSize: 12,
  titleFontSize: 12,
} as const

export const mmToPt = (mm: number) => (mm * 72) / 25.4

// The name sits in the bottom-left corner: as wide as the QR code leaves it, as tall as
// the logo leaves it.  Both renderers size the name block from this.
export const NAME_BOX = {
  width: NAME_TAG.width - 2 * NAME_TAG.padding - NAME_TAG.qrSize - NAME_TAG.gap,
  height: NAME_TAG.height - 2 * NAME_TAG.padding - NAME_TAG.logoHeight,
} as const

export interface NameTagExhibition {
  title: string
  venue?: string | null
}

export interface NameTagExhibitor {
  id: number
  nameTagName?: string | null
  nameTagShowNickname: boolean
  user: {
    fullName: string
    nickname?: string | null
  }
}

export const getNameTagName = (exhibitor: NameTagExhibitor): string =>
  exhibitor.nameTagName?.trim() ||
  exhibitor.user.fullName.trim() ||
  exhibitor.user.nickname?.trim() ||
  ''

export const getNameTagNickname = (exhibitor: NameTagExhibitor): string | null =>
  exhibitor.nameTagShowNickname && exhibitor.user.nickname ? `@${exhibitor.user.nickname}` : null

const NAME_FONT_SIZES = [19, 16, 13, 11]
const CHAR_WIDTH_EM = 0.52 // Lato Bold, averaged over mixed-case Latin text
const LINE_HEIGHT = 1.2
const WRAP_SLACK = 0.85 // word wrapping leaves lines ragged, so not all width is usable

// A name keeps the full size whenever it fits.  Only one that would otherwise be clipped
// steps down, since the tag cannot grow -- see NAME_BOX.  The estimate is deliberately
// pessimistic: shrinking a name that would just have fitted is harmless, printing one
// that runs into the QR code is not.
export const getNameFontSize = (name: string, hasNickname: boolean): number => {
  const trimmed = name.trim()
  const longestWord = Math.max(...trimmed.split(/\s+/).map((word) => word.length))
  const width = mmToPt(NAME_BOX.width)
  const height =
    mmToPt(NAME_BOX.height) - (hasNickname ? NAME_TAG.nicknameFontSize * LINE_HEIGHT : 0)

  const fits = (size: number) => {
    const charWidth = size * CHAR_WIDTH_EM
    if (longestWord * charWidth > width) return false
    const lines = Math.ceil((trimmed.length * charWidth) / (width * WRAP_SLACK))
    return lines * size * LINE_HEIGHT <= height
  }

  return NAME_FONT_SIZES.find(fits) ?? NAME_FONT_SIZES[NAME_FONT_SIZES.length - 1]
}

export const getNameTagUrl = (exhibitorId: number): string =>
  `${window.location.origin}/exhibitor/${exhibitorId}`
