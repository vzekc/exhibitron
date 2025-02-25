import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as backend from '../api/index'
import { useUser } from '../contexts/userUtils.ts'
import DropdownMenu from './DropdownMenu.tsx'
import SearchTableNumber from './SearchTableNumber.tsx'
import { getBookmarks } from '../utils/bookmarks.ts'
import LoginModal from './LoginModal.tsx'

const NavBar = () => {
  const { user } = useUser()
  const [hasBookmarks, setHasBookmarks] = useState(getBookmarks().length > 0)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleLogout = async () => {
    await backend.postAuthLogout()
    window.location.reload()
  }

  useEffect(() => {
    const updateBookmarks = () => {
      setHasBookmarks(getBookmarks().length > 0)
    }

    window.addEventListener('storage', updateBookmarks)
    window.addEventListener('bookmarksUpdated', updateBookmarks)

    return () => {
      window.removeEventListener('storage', updateBookmarks)
      window.removeEventListener('bookmarksUpdated', updateBookmarks)
    }
  }, [])

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
        {user?.isAdministrator && (
          <li>
            <DropdownMenu label="Verwaltung">
              <li>
                <Link to="/admin/registrations">Anmeldungen</Link>
              </li>
            </DropdownMenu>
          </li>
        )}
      </ul>
      <ul>
        {user ? (
          <li>
            <DropdownMenu
              label={
                (user.nickname ? `@${user.nickname}` : user.fullName) ||
                'Profil'
              }>
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
            <button className="button" onClick={() => setShowLoginModal(true)}>
              Login
            </button>
            <LoginModal
              isOpen={showLoginModal}
              onClose={() => setShowLoginModal(false)}
            />
          </li>
        )}
        <li>
          <Link to="/bookmarks">
            <button className="button image-only-button">
              <img
                src={hasBookmarks ? '/bookmarked.svg' : '/bookmark.svg'}
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
