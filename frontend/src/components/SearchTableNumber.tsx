import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

const isMobileDevice = (): boolean => {
  // @ts-expect-error ts2339
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  return /android|iPad|iPhone|iPod/.test(userAgent.toLowerCase())
}

const SearchTableNumber = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

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
    console.log('scan qr code')
  }

  return (
    <form onSubmit={handleSearchSubmit} className="flex">
      <div className="flex">
        {isMobileDevice() && (
          <button onClick={scanQrCode} className="border border-gray-300 bg-gray-100 px-2 py-1">
            <Icon name="scan-qr-code" alt="Scan QR Code" />
          </button>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Tisch #"
          maxLength={3}
          className="w-20 border border-gray-300 px-2 py-1"
        />
        <button type="submit" className="border border-gray-300 bg-gray-100 px-2 py-1">
          <Icon name="search-table" alt="Search Table" />
        </button>
      </div>
    </form>
  )
}

export default SearchTableNumber
