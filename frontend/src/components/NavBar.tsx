import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as backend from '../api/index'
import { useUser } from '../contexts/UserContext.ts'
import DropdownMenu from './DropdownMenu.tsx'
import SearchTableNumber from './SearchTableNumber.tsx'
import { getBookmarks } from '../utils/bookmarks.ts'
import LoginModal from './LoginModal.tsx'
import Breadcrumbs from './Breadcrumbs.tsx'

const NavBar = () => {
  const { user } = useUser()
  const [hasBookmarks, setHasBookmarks] = useState(getBookmarks().length > 0)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleLogout = async () => {
    await backend.postAuthLogout()
    if (window.location.pathname === '/') {
      window.location.reload()
    }
    window.location.pathname = '/'
  }

  const handleShowLoginModal = () => {
    setShowLoginModal(true)
  }

  useEffect(() => {
    const updateBookmarks = () => {
      setHasBookmarks(getBookmarks().length > 0)
    }

    window.addEventListener('storage', updateBookmarks)
    window.addEventListener('bookmarksUpdated', updateBookmarks)
    window.addEventListener('showLoginModal', handleShowLoginModal)

    return () => {
      window.removeEventListener('storage', updateBookmarks)
      window.removeEventListener('bookmarksUpdated', updateBookmarks)
      window.removeEventListener('showLoginModal', handleShowLoginModal)
    }
  }, [])

  return (
    <>
      <nav className="menu">
        <ul>
          <li>
            <Link to="/">Start</Link>
          </li>
          <li>
            <Link to="/exhibit">Ausstellungen</Link>
          </li>
          <li>
            <Link to="/schedule">Zeitplan</Link>
          </li>
          {user?.isAdministrator && (
            <li>
              <DropdownMenu label="Verwaltung">
                <li>
                  <Link to="/admin/registration">Anmeldungen</Link>
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
                  <Link to="/user/account">Konto</Link>
                </li>
                <li>
                  <Link to="/user/profile">Profil</Link>
                </li>
                <li>
                  <Link to="/user/exhibits">Meine Ausstellungen</Link>
                </li>
                <li>
                  <Link to="/user/exhibitorInfo">Aussteller-Infos</Link>
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
              <button
                className="button"
                onClick={() => setShowLoginModal(true)}>
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
      <Breadcrumbs />
    </>
  )
}

export default NavBar
