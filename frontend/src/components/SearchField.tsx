import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import Icon from './Icon'
import { Html5Qrcode } from 'html5-qrcode'
import { SEARCH } from '@pages/Search.tsx'

/*
 * Das eine Suchfeld der Navigationsleiste. Eine Foto-ID vom Laufzettel, eine
 * Tischnummer oder der Forums-Nickname eines Mitwirkenden führen direkt auf
 * deren Seite, jeder andere Text auf die Liste der Treffer. Auf dem Telefon
 * liest der Knopf davor den QR-Code eines Tischschilds.
 */

const isMobileDevice = (): boolean => {
  // @ts-expect-error ts2339
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  return /android|ipad|iphone|ipod/.test(userAgent.toLowerCase())
}

const SearchField = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const navigate = useNavigate()
  const client = useApolloClient()

  useEffect(() => {
    let scanner: Html5Qrcode | null = null

    if (isScanning) {
      scanner = new Html5Qrcode('reader')

      void scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
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
            console.log('error parsing QR code:', error)
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
        void scanner.stop()
      }
    }
  }, [isScanning, navigate])

  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    setSearchQuery('')
    const { data } = await client.query({
      query: SEARCH,
      variables: { query },
      fetchPolicy: 'network-only',
    })
    navigate(data?.search.target ?? `/suche?q=${encodeURIComponent(query)}`)
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
      <form onSubmit={(e) => void handleSearchSubmit(e)} className="flex min-w-0 shrink-0">
        <div className="flex min-w-0">
          {isMobileDevice() && (
            <button
              onClick={scanQrCode}
              className="shrink-0 border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
              <Icon name="scan-qr-code" alt="Scan QR Code" />
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche"
            title="Foto-ID, Tischnummer, Nickname oder Text"
            aria-label="Suche nach Foto-ID, Tischnummer, Nickname oder Text"
            autoComplete="off"
            spellCheck={false}
            className="w-20 min-w-0 shrink border border-gray-300 bg-white px-2 py-1 text-gray-900 placeholder-gray-500 sm:w-28 lg:w-44 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            className="shrink-0 border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
            <Icon name="search-table" alt="Suchen" />
          </button>
        </div>
      </form>

      {isScanning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleClose}>
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-4 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}>
            <div id="reader" className="aspect-square w-full" style={{ minHeight: '300px' }} />
          </div>
        </div>
      )}
    </>
  )
}

export default SearchField
