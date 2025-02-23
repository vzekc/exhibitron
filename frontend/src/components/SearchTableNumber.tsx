import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  const imageOnlyButtonStyle = { padding: '0px 10px 00px 10px' }
  const buttonImageStyle = {
    width: '2em',
    height: '2em',
    filter: 'invert(1)',
  }

  const scanQrCode = () => {
    console.log('scan qr code')
  }

  return (
    <form onSubmit={handleSearchSubmit}>
      <fieldset role="group">
        <button
          className="button"
          style={imageOnlyButtonStyle}
          onClick={scanQrCode}>
          <img src="/scan-qr-code.svg" style={buttonImageStyle}></img>
        </button>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          style={{ width: '4em' }}
        />
        <button className="button" style={imageOnlyButtonStyle} type="submit">
          <img src="/search-table.svg" style={buttonImageStyle}></img>
        </button>
      </fieldset>
    </form>
  )
}

export default SearchTableNumber
