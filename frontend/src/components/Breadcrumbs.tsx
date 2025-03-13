import { Link, RouteObject, useLocation } from 'react-router-dom'
import './Breadcrumbs.css'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import routes from '../routes.tsx'

const breadcrumbMap: { [key: string]: string } = {
  registration: 'Anmeldungen',
  exhibit: 'Exponate',
  admin: 'Verwaltung',
  schedule: 'Zeitplan',
  profile: 'Profil',
  account: 'Konto',
  exhibitorInfo: 'Aussteller-Infos',
  user: 'Aussteller',
}

const Breadcrumbs = () => {
  const location = useLocation()
  const { detailNames } = useBreadcrumb()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  const routeExists = (path: string, routes: RouteObject[]): boolean => {
    for (const route of routes) {
      if (route.path === path) {
        return true
      }
      if (route.children && routeExists(path, route.children)) {
        return true
      }
    }
    return false
  }

  return (
    <nav aria-label="breadcrumb" className="breadcrumbs">
      <ol>
        {pathSegments.map((segment, index) => {
          const path = `/${pathSegments.slice(0, index + 1).join('/')}`
          const isLast = index === pathSegments.length - 1
          const label = isLast
            ? detailNames[path] || breadcrumbMap[segment] || segment
            : breadcrumbMap[segment] || segment
          return (
            <li
              key={path}
              className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
              {isLast || !routeExists(path, routes) ? (
                label
              ) : (
                <Link to={path}>{label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
