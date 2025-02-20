import { Link } from 'react-router-dom'
import { useState } from 'react'

const NavBar = () => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Implement search functionality here
    console.log('Search query:', searchQuery)
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
      </ul>
      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Tischnummer, Stichwort..."
        />
        <button type="submit">Suchen</button>
      </form>
    </nav>
  )
}

export default NavBar
