export type ImageVariant = {
  maxWidth: number
  maxHeight: number
  quality?: number
  format?: 'gif'
}

/*
 * A picture is stored as it was uploaded and served in the size its use calls for. The
 * `display` variant is the exhibit picture as the exhibit page and the exhibit PDF show it:
 * a photo from a phone is 4000 pixels wide and a few megabytes, while the page draws it at
 * most 1600 pixels wide and the PDF at a third of a page. The `profile` variant is the
 * portrait as the chips and the profile page draw it. Both keep the format of the upload,
 * so a screenshot stays lossless.
 */
export const IMAGE_VARIANTS: Record<string, ImageVariant> = {
  thumbnail: {
    maxWidth: 150,
    maxHeight: 150,
  },
  profile: {
    maxWidth: 400,
    maxHeight: 400,
  },
  display: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 85,
  },
  htmlThumbnail: {
    maxWidth: 75,
    maxHeight: 75,
    quality: 85,
  },
  htmlSmall: {
    maxWidth: 400,
    maxHeight: 300,
    quality: 85,
  },
  htmlLarge: {
    maxWidth: 800,
    maxHeight: 600,
    quality: 90,
  },
  htmlThumbnailGif: {
    maxWidth: 75,
    maxHeight: 75,
    format: 'gif',
  },
  htmlSmallGif: {
    maxWidth: 400,
    maxHeight: 300,
    format: 'gif',
  },
  htmlLargeGif: {
    maxWidth: 800,
    maxHeight: 600,
    format: 'gif',
  },
} as const

export type ImageVariantName = keyof typeof IMAGE_VARIANTS
