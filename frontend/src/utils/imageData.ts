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
