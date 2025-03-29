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

const NavBar = () => {
  const { exhibitor } = useExhibitor()
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
    <li className="mr-4">
      <Link
        to={path}
        className={`block rounded px-3 py-2 text-xl hover:bg-gray-100 ${navClasses[path] ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
        {label}
      </Link>
    </li>
  )

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 bg-white shadow-md">
        <div className="mx-auto px-4">
          <div className="flex justify-between py-2">
            <ul className="flex">
              <ToplevelNavItem path="/" label="Start" />
              <ToplevelNavItem path="/exhibit" label="Exponate" />
              <ToplevelNavItem path="/exhibitor" label="Mitwirkende" />
              <ToplevelNavItem path="/schedule" label="Zeitplan" />
              <ToplevelNavItem path="/table" label="Tische" />
            </ul>
            <ul className="flex items-center">
              {exhibitor ? (
                <li className="mr-4">
                  <DropdownMenu label="Backstage">
                    <li className="hover:bg-gray-100">
                      <Link to="/user/account" className="block px-4 py-2 text-gray-700">
                        Konto
                      </Link>
                    </li>
                    <li className="hover:bg-gray-100">
                      <Link to="/user/profile" className="block px-4 py-2 text-gray-700">
                        Profil
                      </Link>
                    </li>
                    <li className="hover:bg-gray-100">
                      <Link to="/user/exhibit" className="block px-4 py-2 text-gray-700">
                        Deine Exponate
                      </Link>
                    </li>
                    <li className="hover:bg-gray-100">
                      <Link to="/user/exhibitorInfo" className="block px-4 py-2 text-gray-700">
                        Infos für Mitwirkende
                      </Link>
                    </li>
                    <li className="hover:bg-gray-100">
                      <a
                        href="https://www.classic-computing.de/cc2025faq"
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="block px-4 py-2 text-gray-700">
                        FAQ
                      </a>
                    </li>
                    <li className="hover:bg-gray-100">
                      <Link to="/user/help" className="block px-4 py-2 text-gray-700">
                        Hilfe
                      </Link>
                    </li>
                    {exhibitor.user.isAdministrator && (
                      <>
                        <li>
                          <hr className="my-1 border-gray-200" />
                        </li>
                        <li className="hover:bg-gray-100">
                          <Link to="/admin/registration" className="block px-4 py-2 text-gray-700">
                            Anmeldungen
                          </Link>
                        </li>
                        <li className="hover:bg-gray-100">
                          <Link to="/admin/page" className="block px-4 py-2 text-gray-700">
                            Seiten
                          </Link>
                        </li>
                        <li className="hover:bg-gray-100">
                          <Link to="/admin/tableLabels" className="block px-4 py-2 text-gray-700">
                            Tisch-Labels
                          </Link>
                        </li>
                      </>
                    )}
                    <li>
                      <hr className="my-1 border-gray-200" />
                    </li>
                    <li className="hover:bg-gray-100">
                      <a href="#" onClick={handleLogout} className="block px-4 py-2 text-gray-700">
                        Logout
                      </a>
                    </li>
                  </DropdownMenu>
                </li>
              ) : (
                <li className="mr-4">
                  <Button onClick={handleLogin}>Login</Button>
                </li>
              )}
              <li className="mr-4">
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
      </nav>
      <div className="h-[120px]" />{' '}
      {/* Spacer to prevent content from being hidden under fixed navbar */}
    </>
  )
}

export default NavBar
