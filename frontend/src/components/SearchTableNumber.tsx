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

  return (
    <form onSubmit={handleSearchSubmit}>
      <fieldset role="group">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Tisch"
          style={{ width: '4em' }}
        />
        <button type="submit">suchen</button>
      </fieldset>
    </form>
  )
}

export default SearchTableNumber
