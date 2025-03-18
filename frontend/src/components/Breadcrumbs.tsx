import { Link, useLocation } from 'react-router-dom'
import './Breadcrumbs.css'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import { useEffect } from 'react'

const breadcrumbMap: { [key: string]: string } = {
  '/': 'CC2025',
  '/exhibit': 'Exponate',
  '/exhibitor': 'Aussteller',
  '/table': 'Tische',
  '/schedule': 'Zeitplan',
  '/bookmarks': 'Lesezeichen',
  '/user/profile': 'Profil',
  '/user/account': 'Konto',
  '/user/exhibit': 'Deine Exponate',
  '/user/exhibitorInfo': 'Aussteller-Infos',
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
    return detailNames[path] || breadcrumbMap[path] || path
  }

  // Update navigation history when location changes
  useEffect(() => {
    addToHistory(location.pathname)
  }, [location.pathname, addToHistory])

  const breadcrumbsToShow = navHistory.slice(-3)

  return (
    <nav aria-label="breadcrumb" className="breadcrumbs">
      <ol>
        {breadcrumbsToShow.map((item, index) => {
          const isLast = index === breadcrumbsToShow.length - 1
          return (
            <li key={item.path} className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
              {isLast ? getLabel(item.path) : <Link to={item.path}>{getLabel(item.path)}</Link>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
