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

interface NavListProps {
  items: React.ReactNode[]
  className?: string
}

const NavList = ({ items, className = '' }: NavListProps) => (
  <ul className={`flex ${className}`}>
    {items.map((item, index) => (
      <li key={index} className="mr-3">
        {item}
      </li>
    ))}
  </ul>
)

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
    if (!processedLoginParam && searchParams.has('login')) {
      setProcessedLoginParam(true)
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

  // Common navigation items used in both mobile and desktop
  const commonNavItems = [
    { to: '/', label: 'Start' },
    { to: '/exhibit', label: 'Exponate' },
    { to: '/exhibitor', label: 'Mitwirkende' },
    { to: '/schedule', label: 'Zeitplan' },
    { to: '/table', label: 'Tische' },
  ]

  // Common user menu items
  const commonUserMenuItems = [
    { to: '/user/account', label: 'Konto' },
    { to: '/user/profile', label: 'Profil' },
    { to: '/user/exhibit', label: 'Deine Exponate' },
    { to: '/user/exhibitorInfo', label: 'Infos für Mitwirkende' },
    { to: 'https://www.classic-computing.de/cc2025faq', label: 'FAQ' },
    { to: '/user/help', label: 'Hilfe' },
    { type: 'divider' },
    { type: 'logout', label: 'Logout' },
  ]

  // Common admin menu items
  const commonAdminMenuItems = [
    { to: '/admin/registration', label: 'Anmeldungen' },
    { to: '/admin/page', label: 'Seiten' },
    { to: '/admin/tableLabels', label: 'Tisch-Labels' },
  ]

  const renderUserMenuItem = (item: (typeof commonUserMenuItems)[0], onClose?: () => void) => {
    if (item.type === 'divider') {
      return <hr key="divider" className="my-1 border-gray-200" />
    }
    if (item.type === 'logout') {
      return (
        <MenuItem
          key="logout"
          onClick={(e) => {
            handleLogout(e)
            onClose?.()
          }}>
          {item.label}
        </MenuItem>
      )
    }
    return (
      <MenuItem key={item.to} to={item.to} onClick={() => onClose?.()}>
        {item.label}
      </MenuItem>
    )
  }

  // Desktop navigation items
  const desktopNavItems = [
    ...commonNavItems.map((item) => (
      <MenuItem
        key={item.to}
        to={item.to}
        isActive={isActivePath(item.to)}
        onClick={() => setIsMobileMenuOpen(false)}>
        {item.label}
      </MenuItem>
    )),
    ...(exhibitor?.user.isAdministrator
      ? [
          <DropdownMenu key="admin" label={<MenuItem hasDropdown>Administration</MenuItem>}>
            {commonAdminMenuItems.map((item) => (
              <MenuItem key={item.to} to={item.to}>
                {item.label}
              </MenuItem>
            ))}
          </DropdownMenu>,
        ]
      : []),
  ]

  // User navigation items for desktop
  const desktopUserNavItems = exhibitor
    ? [
        <DropdownMenu
          key="user"
          label={
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
              <Icon name="user" alt="User Menu" />
            </div>
          }>
          {commonUserMenuItems.map((item) => renderUserMenuItem(item))}
        </DropdownMenu>,
      ]
    : [
        <Button key="login" onClick={handleLogin}>
          Login
        </Button>,
      ]

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
      <nav className="fixed left-0 right-0 top-0 z-50 w-screen bg-white shadow-md">
        <div className="mx-auto w-full max-w-[100vw] overflow-x-hidden px-4">
          <div className="flex justify-between py-2">
            <div className="flex min-w-0 items-center">
              <MobileMenuButton />
              <div className="hidden items-center md:flex">
                <NavList items={desktopNavItems} />
              </div>
            </div>
            <ul className="flex min-w-0 items-center gap-2">
              <div className="hidden md:block">{desktopUserNavItems}</div>
              <li>
                <Link
                  to="/bookmarks"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                  <Icon name={hasBookmarks ? 'bookmarked' : 'bookmark'} alt="Bookmarks" />
                </Link>
              </li>
              <li className="shrink-0">
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
                {commonNavItems.map((item) => (
                  <li key={item.to}>
                    <MenuItem
                      to={item.to}
                      isActive={isActivePath(item.to)}
                      onClick={() => setIsMobileMenuOpen(false)}>
                      {item.label}
                    </MenuItem>
                  </li>
                ))}
              </ul>
              {exhibitor ? (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-500">Benutzer</h3>
                  <ul className="space-y-2">
                    {commonUserMenuItems.map((item) =>
                      renderUserMenuItem(item, () => setIsMobileMenuOpen(false)),
                    )}
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
                    {commonAdminMenuItems.map((item) => (
                      <MenuItem
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="h-[120px]" />
    </>
  )
}

export default NavBar
