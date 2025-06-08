import React, { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import Confirm from './Confirm'
import { showMessage } from './MessageModalUtil'
import ImageCropper from './ImageCropper'

interface ImageUploaderProps {
  imageId: number | null
  imageUrl: string
  onImageChange?: (imageId: number | null) => void
  title?: string
  uploadButtonText?: string
  deleteButtonText?: string
  noImageText?: string
  dragDropText?: string
  alt?: string
  enableCropping?: boolean
}

const ImageUploader = ({
  imageId,
  imageUrl,
  onImageChange,
  title = 'Bild',
  uploadButtonText = 'Bild hochladen',
  deleteButtonText = 'Bild löschen',
  noImageText = 'Kein Bild vorhanden',
  dragDropText = 'Bild hierher ziehen',
  alt = 'Bild',
  enableCropping = false,
}: ImageUploaderProps) => {
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [showDeleteImageConfirm, setShowDeleteImageConfirm] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!file) return

      setIsImageLoading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.put(imageUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        // If the response includes an image ID, use it
        if (response.data?.id) {
          onImageChange?.(response.data.id)
        } else if (!imageId && onImageChange) {
          // If we didn't have an image before, assume we have one now
          onImageChange(1) // Placeholder ID
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        await showMessage('Fehler', 'Fehler beim Hochladen des Bildes')
      } finally {
        setIsImageLoading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [imageId, imageUrl, onImageChange],
  )

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (enableCropping) {
        const reader = new FileReader()
        reader.onload = () => {
          setTempImageUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        handleImageUpload(file)
      }
    }
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setTempImageUrl(null)
    await handleImageUpload(
      new File([croppedImageBlob], 'cropped-image.jpg', { type: 'image/jpeg' }),
    )
  }

  const handleDeleteImage = () => {
    setShowDeleteImageConfirm(true)
  }

  const handleConfirmDeleteImage = async () => {
    if (!imageId) return

    setIsImageLoading(true)
    try {
      await axios.delete(imageUrl)
      onImageChange?.(null)
    } catch (error) {
      console.error('Error deleting image:', error)
      await showMessage('Fehler', 'Fehler beim Löschen des Bildes')
    } finally {
      setIsImageLoading(false)
      setShowDeleteImageConfirm(false)
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith('image/')) {
          if (enableCropping) {
            const reader = new FileReader()
            reader.onload = () => {
              setTempImageUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
          } else {
            handleImageUpload(file)
          }
        } else {
          await showMessage('Falsches Dateiformat', 'Bitte nur Bilddateien hochladen')
        }
      }
    },
    [enableCropping, handleImageUpload],
  )

  return (
    <div className="mb-6">
      {title && <h3 className="mb-2 text-lg font-medium text-gray-700">{title}</h3>}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex aspect-square w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} ${isImageLoading ? 'opacity-70' : ''} ${imageId ? '' : 'cursor-pointer'} `}
        onClick={() => !imageId && fileInputRef.current?.click()}>
        {isImageLoading ? (
          <div className="flex flex-col items-center justify-center p-4">
            <svg
              className="mb-2 h-10 w-10 animate-spin text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600">Bild wird verarbeitet...</p>
          </div>
        ) : imageId ? (
          <>
            <div className="relative h-full w-full">
              <img src={imageUrl} alt={alt} className="h-full w-full object-contain p-2" />
              <div
                className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 transition-opacity duration-200 ${isDragging ? 'bg-opacity-40' : 'opacity-0 hover:bg-opacity-40 hover:opacity-100'} `}>
                {isDragging ? (
                  <p className="font-medium text-white drop-shadow-md">Zum Ersetzen loslassen</p>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteImage()
                    }}
                    className="rounded bg-red-500 px-3 py-1 text-white shadow hover:bg-red-600">
                    {deleteButtonText}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="mb-3 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="mb-2 text-sm text-gray-600">{noImageText}</p>
            <p className="text-sm text-gray-500">
              {isDragging ? (
                <span className="font-medium text-blue-500">Zum Hochladen loslassen</span>
              ) : (
                dragDropText
              )}
            </p>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="mt-3 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
              {uploadButtonText}
            </button>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />
      <Confirm
        isOpen={showDeleteImageConfirm}
        title={title ? `${title} löschen` : 'Bild löschen'}
        message={`Möchtest Du das ${title ? title.toLowerCase() : 'Bild'} wirklich löschen?`}
        confirm="Löschen"
        cancel="Abbrechen"
        onConfirm={handleConfirmDeleteImage}
        onClose={() => setShowDeleteImageConfirm(false)}
      />
      {tempImageUrl && enableCropping && (
        <ImageCropper
          imageUrl={tempImageUrl}
          onCropDone={handleCropComplete}
          onCancel={() => {
            setTempImageUrl(null)
          }}
        />
      )}
    </div>
  )
}

export default ImageUploader
