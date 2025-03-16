import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useUser } from '../contexts/UserContext.ts'
import DropdownMenu from './DropdownMenu.tsx'
import SearchTableNumber from './SearchTableNumber.tsx'
import { getBookmarks } from '../utils/bookmarks.ts'
import Breadcrumbs from './Breadcrumbs.tsx'
import { gql, useMutation } from '@apollo/client'
import './NavBar.css'

const NavBar = () => {
  const { user } = useUser()
  const location = useLocation()
  const [hasBookmarks, setHasBookmarks] = useState(getBookmarks().exhibits.length > 0)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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

  // Track if we've processed the login parameter
  const [processedLoginParam, setProcessedLoginParam] = useState(false)

  const currentPath = '/' + (location.pathname.split('/')[1] || '')
  const navClasses: Partial<Record<string, string>> = {
    [currentPath]: 'active',
  }

  useEffect(() => {
    // Only process if we haven't already and the login parameter exists
    if (!processedLoginParam && searchParams.has('login')) {
      // Mark as processed to prevent repeated processing
      setProcessedLoginParam(true)

      // Redirect to login page with current path as redirectUrl
      navigate(`/login?redirectUrl=${encodeURIComponent(location.pathname + location.search)}`, {
        replace: true,
      })
    }
  }, [searchParams, navigate, processedLoginParam, location])

  const handleLogout = async (event: React.MouseEvent) => {
    event.preventDefault()
    await logout()
  }

  const handleLogin = () => {
    // Store current path in redirectUrl
    navigate(`/login?redirectUrl=${encodeURIComponent(location.pathname + location.search)}`)
  }

  useEffect(() => {
    const updateBookmarks = () => {
      setHasBookmarks(getBookmarks().exhibits.length > 0)
    }

    window.addEventListener('storage', updateBookmarks)
    window.addEventListener('bookmarksUpdated', updateBookmarks)

    return () => {
      window.removeEventListener('storage', updateBookmarks)
      window.removeEventListener('bookmarksUpdated', updateBookmarks)
    }
  }, [])

  const ToplevelNavItem = ({ path, label }: { path: string; label: string }) => (
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
          <ToplevelNavItem path="/table" label="Tische" />
        </ul>
        <ul>
          {user ? (
            <li>
              <DropdownMenu label="Backstage">
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
                  <Link to="/user/help">Hilfe</Link>
                </li>
                {user.isAdministrator && (
                  <>
                    <li className="dropdown-divider">
                      <hr />
                    </li>
                    <li>
                      <Link to="/admin/registration">Anmeldungen</Link>
                    </li>
                    <li>
                      <Link to="/admin/page">Seiten</Link>
                    </li>
                  </>
                )}
                <li className="dropdown-divider">
                  <hr />
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
              <button className="button" onClick={handleLogin}>
                Login
              </button>
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
