import { Link, useLocation } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useUser } from '../contexts/UserContext.ts'
import DropdownMenu from './DropdownMenu.tsx'
import SearchTableNumber from './SearchTableNumber.tsx'
import { getBookmarks } from '../utils/bookmarks.ts'
import LoginModal from './LoginModal.tsx'
import Breadcrumbs from './Breadcrumbs.tsx'
import { gql, useMutation } from '@apollo/client'
import './NavBar.css'

const NavBar = () => {
  const { user } = useUser()
  const location = useLocation()
  const [hasBookmarks, setHasBookmarks] = useState(
    getBookmarks().exhibits.length > 0,
  )
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [logout] = useMutation(
    gql`
      mutation Logout {
        logout
      }
    `,
    {
      onCompleted: () => {
        if (window.location.pathname === '/') {
          window.location.reload()
        }
        window.location.pathname = '/'
      },
      onError: (error) => {
        console.error('Logout failed:', error)
      },
    },
  )

  const currentPath = '/' + (location.pathname.split('/')[1] || '')
  const navClasses: Partial<Record<string, string>> = {
    [currentPath]: 'active',
  }

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault()
    await logout()
  }

  const handleShowLoginModal = () => {
    setShowLoginModal(true)
  }

  useEffect(() => {
    const updateBookmarks = () => {
      setHasBookmarks(getBookmarks().exhibits.length > 0)
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

  const ToplevelNavItem = ({
    path,
    label,
  }: {
    path: string
    label: string
  }) => (
    <li className={navClasses[path] || ''}>
      <Link to={path}>{label}</Link>
    </li>
  )

  return (
    <>
      <nav className="menu">
        <ul>
          <ToplevelNavItem path="/" label="Start" />
          <ToplevelNavItem path="/exhibit" label="Exponate" />
          <ToplevelNavItem path="/exhibitor" label="Aussteller" />
          <ToplevelNavItem path="/schedule" label="Zeitplan" />
          {user?.isAdministrator && (
            <li className={navClasses['/admin'] || ''}>
              <DropdownMenu label="Verwaltung">
                <li>
                  <Link to="/admin/registration">Anmeldungen</Link>
                </li>
                <li>
                  <Link to="/admin/page">Seiten</Link>
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
                  <Link to="/user/exhibit">Meine Exponate</Link>
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
