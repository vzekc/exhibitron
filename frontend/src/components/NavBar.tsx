import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import DropdownMenu from './DropdownMenu.tsx'
import SearchTableNumber from './SearchTableNumber.tsx'
import { getBookmarks } from '@utils/bookmarks.ts'
import Breadcrumbs from './Breadcrumbs.tsx'
import { gql, useMutation } from '@apollo/client'
import Icon from './Icon'
import Button from '@components/Button.tsx'

interface MenuItemProps {
  to?: string
  onClick?: (e: React.MouseEvent) => void
  children: React.ReactNode
  className?: string
  isActive?: boolean
  hasDropdown?: boolean
}

const MenuItem = ({
  to,
  onClick,
  children,
  className = '',
  isActive,
  hasDropdown,
}: MenuItemProps) => {
  const baseClasses = 'block rounded px-3 py-2 text-xl hover:bg-gray-100'
  const activeClasses = isActive ? 'font-bold text-blue-600' : 'text-gray-700'
  const combinedClasses = `${baseClasses} ${activeClasses} ${className}`

  const content = (
    <>
      <span className="flex items-center">
        {children}
        {hasDropdown && (
          <svg
            className="ml-1 h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={combinedClasses} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return (
    <a href="#" className={combinedClasses} onClick={onClick}>
      {content}
    </a>
  )
}

const NavBar = () => {
  const { exhibitor } = useExhibitor()
  const location = useLocation()
  const [hasBookmarks, setHasBookmarks] = useState(getBookmarks().exhibits.length > 0)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
  const isActivePath = (path: string) => currentPath === path

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
    <li className="mr-3">
      <MenuItem to={path} isActive={isActivePath(path)} onClick={() => setIsMobileMenuOpen(false)}>
        {label}
      </MenuItem>
    </li>
  )

  const MobileMenuButton = () => (
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden">
      <span className="sr-only">Open main menu</span>
      {!isMobileMenuOpen ? (
        <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      ) : (
        <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  )

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 bg-white shadow-md">
        <div className="mx-auto px-4">
          <div className="flex justify-between py-2">
            <div className="flex items-center">
              <MobileMenuButton />
              <div className="hidden items-center md:flex">
                <ul className="flex">
                  <ToplevelNavItem path="/" label="Start" />
                  <ToplevelNavItem path="/exhibit" label="Exponate" />
                  <ToplevelNavItem path="/exhibitor" label="Mitwirkende" />
                  <ToplevelNavItem path="/schedule" label="Zeitplan" />
                  <ToplevelNavItem path="/table" label="Tische" />
                  {exhibitor?.user.isAdministrator && (
                    <li className="mr-3">
                      <DropdownMenu label={<MenuItem hasDropdown>Administration</MenuItem>}>
                        <li>
                          <MenuItem to="/admin/registration">Anmeldungen</MenuItem>
                        </li>
                        <li>
                          <MenuItem to="/admin/page">Seiten</MenuItem>
                        </li>
                        <li>
                          <MenuItem to="/admin/tableLabels">Tisch-Labels</MenuItem>
                        </li>
                      </DropdownMenu>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <ul className="flex items-center">
              {exhibitor ? (
                <li className="mr-3 hidden md:block">
                  <DropdownMenu
                    label={
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
                        <Icon name="user" alt="User Menu" />
                      </div>
                    }>
                    <li>
                      <MenuItem to="/user/account">Konto</MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/profile">Profil</MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/exhibit">Deine Exponate</MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/exhibitorInfo">Infos für Mitwirkende</MenuItem>
                    </li>
                    <li>
                      <MenuItem to="https://www.classic-computing.de/cc2025faq">FAQ</MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/help">Hilfe</MenuItem>
                    </li>
                    <li>
                      <hr className="my-1 border-gray-200" />
                    </li>
                    <li>
                      <MenuItem onClick={handleLogout}>Logout</MenuItem>
                    </li>
                  </DropdownMenu>
                </li>
              ) : (
                <li className="mr-3 hidden md:block">
                  <Button onClick={handleLogin}>Login</Button>
                </li>
              )}
              <li className="mr-3">
                <Link
                  to="/bookmarks"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                  <Icon name={hasBookmarks ? 'bookmarked' : 'bookmark'} alt="Bookmarks" />
                </Link>
              </li>
              <li>
                <SearchTableNumber />
              </li>
            </ul>
          </div>
          <div className="border-t border-gray-200 py-2">
            <Breadcrumbs />
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-in-out md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
              <h2 className="text-xl font-semibold">Menu</h2>
              <MobileMenuButton />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ul className="space-y-2">
                <ToplevelNavItem path="/" label="Start" />
                <ToplevelNavItem path="/exhibit" label="Exponate" />
                <ToplevelNavItem path="/exhibitor" label="Mitwirkende" />
                <ToplevelNavItem path="/schedule" label="Zeitplan" />
                <ToplevelNavItem path="/table" label="Tische" />
              </ul>
              {exhibitor ? (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-500">Benutzer</h3>
                  <ul className="space-y-2">
                    <li>
                      <MenuItem to="/user/account" onClick={() => setIsMobileMenuOpen(false)}>
                        Konto
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/profile" onClick={() => setIsMobileMenuOpen(false)}>
                        Profil
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/exhibit" onClick={() => setIsMobileMenuOpen(false)}>
                        Deine Exponate
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/exhibitorInfo" onClick={() => setIsMobileMenuOpen(false)}>
                        Infos für Mitwirkende
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem
                        to="https://www.classic-computing.de/cc2025faq"
                        onClick={() => setIsMobileMenuOpen(false)}>
                        FAQ
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/user/help" onClick={() => setIsMobileMenuOpen(false)}>
                        Hilfe
                      </MenuItem>
                    </li>
                    <li>
                      <hr className="my-1 border-gray-200" />
                    </li>
                    <li>
                      <MenuItem
                        onClick={(e) => {
                          handleLogout(e)
                          setIsMobileMenuOpen(false)
                        }}>
                        Logout
                      </MenuItem>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <Button
                    onClick={() => {
                      handleLogin()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full">
                    Login
                  </Button>
                </div>
              )}
              {exhibitor?.user.isAdministrator && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-500">Administration</h3>
                  <ul className="space-y-2">
                    <li>
                      <MenuItem to="/admin/registration" onClick={() => setIsMobileMenuOpen(false)}>
                        Anmeldungen
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/admin/page" onClick={() => setIsMobileMenuOpen(false)}>
                        Seiten
                      </MenuItem>
                    </li>
                    <li>
                      <MenuItem to="/admin/tableLabels" onClick={() => setIsMobileMenuOpen(false)}>
                        Tisch-Labels
                      </MenuItem>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="h-[120px]" />{' '}
      {/* Spacer to prevent content from being hidden under fixed navbar */}
    </>
  )
}

export default NavBar
