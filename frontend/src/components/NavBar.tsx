import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const NavBar = () => {
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
    <nav>
      <ul>
        <li>
          <Link to="/">Start</Link>
        </li>
        <li>
          <Link to="/exhibits">Ausstellungen</Link>
        </li>
        <li>
          <Link to="/schedule">Zeitplan</Link>
        </li>
        <li>
          <Link to="/bookmarks">Lesezeichen</Link>
        </li>
      </ul>
      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Tischnummer..."
        />
        <button type="submit">Tisch suchen</button>
      </form>
    </nav>
  )
}

export default NavBar
