import { Link, useLocation } from 'react-router-dom'
import './Breadcrumbs.css'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import { useEffect } from 'react'

const breadcrumbMap: { [key: string]: string } = {
  registration: 'Anmeldungen',
  exhibit: 'Exponate',
  admin: 'Verwaltung',
  schedule: 'Zeitplan',
  profile: 'Profil',
  account: 'Konto',
  exhibitorInfo: 'Aussteller-Infos',
  user: 'Aussteller',
  page: 'Seiten',
  table: 'Tische',
  exhibitor: 'Aussteller',
  bookmarks: 'Lesezeichen',
  resetPassword: 'Passwort zurücksetzen',
  setupExhibitor: 'Registrierung abschließen',
  help: 'Hilfe',
}

const Breadcrumbs = () => {
  const location = useLocation()
  const { detailNames, navHistory, addToHistory } = useBreadcrumb()

  // Update navigation history when location changes
  useEffect(() => {
    const path = location.pathname
    const pathSegments = path.split('/').filter(Boolean)

    // Get the appropriate label for the current path
    let label = detailNames[path]

    if (!label && pathSegments.length > 0) {
      // If we don't have a detail name, try to find it in the breadcrumb map
      const lastSegment = pathSegments[pathSegments.length - 1]
      label = breadcrumbMap[lastSegment] || lastSegment
    }

    // Default to the path itself if no label was found
    if (!label) {
      label = path === '/' ? 'CC2025' : pathSegments[pathSegments.length - 1] || 'CC2025'
    }

    addToHistory(path, label)
  }, [location.pathname, detailNames, addToHistory])

  // Display only the home item plus the last two navigation items
  const breadcrumbsToShow = navHistory.slice(-3)

  return (
    <nav aria-label="breadcrumb" className="breadcrumbs">
      <ol>
        {breadcrumbsToShow.map((item, index) => {
          const isLast = index === breadcrumbsToShow.length - 1
          return (
            <li key={item.path} className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
              {isLast ? item.label : <Link to={item.path}>{item.label}</Link>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
