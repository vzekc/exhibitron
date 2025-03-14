import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  const scanQrCode = () => {
    console.log('scan qr code')
  }

  return (
    <form onSubmit={handleSearchSubmit}>
      <fieldset role="group">
        {isMobileDevice() && (
          <button className="button image-only-button" onClick={scanQrCode}>
            <img src="/scan-qr-code.svg" className="inverted-image button-image"></img>
          </button>
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          style={{ width: '4em' }}
        />
        <button className="butto image-only-button" type="submit">
          <img src="/search-table.svg" className="inverted-image button-image"></img>
        </button>
      </fieldset>
    </form>
  )
}

export default SearchTableNumber
