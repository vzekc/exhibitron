import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useUser } from '../contexts/UserContext.tsx'
import * as backend from '../api/index'

const NavBar = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const { user } = useUser()

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

  const handleLogout = async () => {
    await backend.postAuthLogout()
    window.location.reload()
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
        {user ? (
          <li>
            <a href="#" onClick={handleLogout}>
              Logout
            </a>
          </li>
        ) : (
          <li>
            <a href="/auth/forum">Login</a>
          </li>
        )}
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
