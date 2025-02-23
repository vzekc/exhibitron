import { Link } from 'react-router-dom'
import * as backend from '../api/index'
import { useUser } from '../contexts/userUtils.ts'
import DropdownMenu from './DropdownMenu.tsx'
import SearchTableNumber from './SearchTableNumber.tsx'

const NavBar = () => {
  const { user } = useUser()

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
      </ul>
      <ul>
        {user ? (
          <li>
            <DropdownMenu label={`@${user.username}`}>
              <li>
                <Link to="/profile">Profil</Link>
              </li>
              <li>
                <a href="#" onClick={handleLogout}>
                  Logout
                </a>
              </li>
            </DropdownMenu>
          </li>
        ) : (
          <li>
            <a href="/auth/forum">Login</a>
          </li>
        )}
        <li>
          <Link to="/bookmarks">
            <button className="button image-only-button">
              <img
                src="/bookmark.svg"
                className="button-image inverted-image"></img>
            </button>
          </Link>
        </li>
        <li>
          <SearchTableNumber />
        </li>
      </ul>
    </nav>
  )
}

export default NavBar
