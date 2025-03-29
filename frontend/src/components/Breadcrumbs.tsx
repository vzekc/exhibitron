import { Link, useLocation } from 'react-router-dom'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import { useEffect } from 'react'

const breadcrumbMap: { [key: string]: string } = {
  '/': 'CC2025',
  '/exhibit': 'Exponate',
  '/exhibitor': 'Mitwirkende',
  '/table': 'Tische',
  '/schedule': 'Zeitplan',
  '/bookmarks': 'Lesezeichen',
  '/user/profile': 'Profil',
  '/user/account': 'Konto',
  '/user/exhibit': 'Deine Exponate',
  '/user/exhibitorInfo': 'Infos für Mitwirkende',
  '/user/help': 'Hilfe',
  '/admin': 'Verwaltung',
  '/admin/page': 'Seiten',
  '/admin/registration': 'Anmeldungen',
  '/resetPassword': 'Passwort zurücksetzen',
  '/setupExhibitor': 'Registrierung abschließen',
  '/help': 'Hilfe',
}

const Breadcrumbs = () => {
  const location = useLocation()
  const { detailNames, navHistory, addToHistory } = useBreadcrumb()

  const getLabel = (path: string) => {
    return detailNames[path] || breadcrumbMap[path] || ''
  }

  // Update navigation history when location changes
  useEffect(() => {
    addToHistory(location.pathname)
  }, [location.pathname, addToHistory])

  const breadcrumbsToShow = navHistory.slice(-3)

  return (
    <nav aria-label="breadcrumb" className="text-sm">
      <ol className="flex">
        {breadcrumbsToShow.map((item, index) => {
          const isLast = index === breadcrumbsToShow.length - 1
          return (
            <li key={item.path} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-500">/</span>}
              {isLast ? (
                <span className="text-gray-500">{getLabel(item.path)}</span>
              ) : (
                <Link to={item.path} className="text-blue-600">
                  {getLabel(item.path)}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
