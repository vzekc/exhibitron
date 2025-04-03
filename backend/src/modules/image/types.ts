export type ImageVariant = {
  maxWidth: number
  maxHeight: number
  quality?: number
}

export const IMAGE_VARIANTS = {
  thumbnail: {
    maxWidth: 150,
    maxHeight: 150,
  },
  profile: {
    maxWidth: 300,
    maxHeight: 300,
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
} as const

export type ImageVariantName = keyof typeof IMAGE_VARIANTS
