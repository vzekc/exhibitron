export interface LoadedImage {
  dataUrl: string
  width: number
  height: number
}

// @react-pdf/renderer cannot consume SVG through <Image src>, so images destined for a
// PDF are rasterised in a canvas first.  The intrinsic size comes back with the data URL
// because react-pdf does not derive the aspect ratio on its own.
export const loadImageData = (imageUrl: string): Promise<LoadedImage> =>
  new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height })
    }

    img.onerror = () => reject(new Error(`Failed to load image ${imageUrl}`))

    img.src = imageUrl
  })

export const getImageDataViaCanvas = async (imageUrl: string): Promise<string> =>
  (await loadImageData(imageUrl)).dataUrl

/*
 * A JPEG or PNG goes into a PDF as it is, so a photo keeps its compression and the PDF
 * stays small. react-pdf reads only those two formats; any other is rasterised.
 */
export const fetchImageDataUrl = async (imageUrl: string): Promise<string> => {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to load image ${imageUrl}`)
  }
  const blob = await response.blob()
  if (blob.type !== 'image/jpeg' && blob.type !== 'image/png') {
    return getImageDataViaCanvas(imageUrl)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Failed to read image ${imageUrl}`))
    reader.readAsDataURL(blob)
  })
}
