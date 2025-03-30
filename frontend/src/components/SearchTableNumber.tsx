import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { Html5QrcodeScanner } from 'html5-qrcode'

const isMobileDevice = (): boolean => {
  // @ts-expect-error ts2339
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  return /android|iPad|iPhone|iPod/.test(userAgent.toLowerCase())
}

const SearchTableNumber = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null

    if (isScanning) {
      scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false,
      )

      scanner.render(
        (decodedText) => {
          try {
            const url = new URL(decodedText)
            // Only accept URLs from the same origin
            if (url.origin === window.location.origin) {
              const path = url.pathname
              // Extract table number from path if it matches the pattern /table/{number}
              const match = path.match(/^\/table\/(\d+)$/)
              if (match) {
                const tableNumber = match[1]
                navigate(`/table/${tableNumber}`)
              }
            }
          } catch (error) {
            // Ignore invalid URLs
            console.log('Invalid QR code:', decodedText, 'error:', error)
          }
          setIsScanning(false)
        },
        (errorMessage) => {
          // Only log errors that are not related to normal scanning attempts
          const isNormalScanningError =
            errorMessage.includes('No barcode or QR code detected') ||
            errorMessage.includes(
              'NotFoundException: No MultiFormat Readers were able to detect the code',
            )

          if (!isNormalScanningError) {
            console.error('QR code scanning error:', errorMessage)
          }
        },
      )
    }

    return () => {
      if (scanner) {
        void scanner.clear()
      }
    }
  }, [isScanning, navigate])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*$/.test(value)) {
      // Only allow numeric input
      setSearchQuery(value)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery) {
      setSearchQuery('')
      navigate(`/table/${searchQuery}`)
    }
  }

  const scanQrCode = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsScanning(true)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsScanning(false)
  }

  return (
    <>
      <form onSubmit={handleSearchSubmit} className="flex min-w-0 shrink-0">
        <div className="flex min-w-0">
          {isMobileDevice() && (
            <button
              onClick={scanQrCode}
              className="shrink-0 border border-gray-300 bg-gray-100 px-2 py-1">
              <Icon name="scan-qr-code" alt="Scan QR Code" />
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Tisch #"
            maxLength={3}
            className="w-14 min-w-0 shrink border border-gray-300 px-2 py-1"
          />
          <button type="submit" className="shrink-0 border border-gray-300 bg-gray-100 px-2 py-1">
            <Icon name="search-table" alt="Search Table" />
          </button>
        </div>
      </form>

      {isScanning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleClose}>
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleClose}
              className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-500 hover:bg-gray-100">
              <Icon name="close" alt="Close" />
            </button>
            <div id="reader" className="w-full" />
          </div>
        </div>
      )}
    </>
  )
}

export default SearchTableNumber
