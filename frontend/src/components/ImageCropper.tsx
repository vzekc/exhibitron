import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import Button from './Button'

interface ImageCropperProps {
  imageUrl: string
  onCropDone: (croppedImageBlob: Blob) => void
  onCancel: () => void
}

const ImageCropper = ({ imageUrl, onCropDone, onCancel }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imageRef.current
    if (!img) return

    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2

      setCrop({
        unit: 'px',
        width: size,
        height: size,
        x,
        y,
      })
    }
  }, [imageUrl])

  const onCropChange = (crop: Crop) => {
    setCrop(crop)
  }

  const onCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop)
  }

  const handleCrop = async () => {
    if (!imageRef.current || !completedCrop) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaleX = imageRef.current.naturalWidth / imageRef.current.width
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height

    canvas.width = completedCrop.width
    canvas.height = completedCrop.height

    ctx.drawImage(
      imageRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    )

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropDone(blob)
        }
      },
      'image/jpeg',
      0.95,
    )
  }

  return (
    <Modal isOpen={true} onClose={onCancel} title="Bild zuschneiden">
      <div className="space-y-4">
        <div className="max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={onCropChange}
            onComplete={onCropComplete}
            aspect={1}
            circularCrop={false}>
            <img ref={imageRef} src={imageUrl} alt="Zu schneidendes Bild" className="max-w-full" />
          </ReactCrop>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Abbrechen</Button>
          <Button onClick={handleCrop} disabled={!completedCrop}>
            Zuschneiden
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ImageCropper
