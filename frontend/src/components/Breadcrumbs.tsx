import { Link, useLocation } from 'react-router-dom'
import './Breadcrumbs.css'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'

const breadcrumbMap: { [key: string]: string } = {
  registration: 'Anmeldungen',
  exhibit: 'Ausstellungen',
  admin: 'Verwaltung',
}

function Breadcrumbs() {
  const location = useLocation()
  const { detailName } = useBreadcrumb()
  const pathSegments = location.pathname.split('/').filter(Boolean)

  if (pathSegments.length < (pathSegments[0] === 'admin' ? 3 : 2)) {
    return null
  }

  return (
    <nav aria-label="breadcrumb" className="breadcrumbs">
      <ol>
        {pathSegments.map((segment, index) => {
          const path = `/${pathSegments.slice(0, index + 1).join('/')}`
          const isLast = index === pathSegments.length - 1
          const label = breadcrumbMap[segment]
          return (
            <li
              key={path}
              className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
              {isLast || segment === 'admin' ? (
                isLast ? (
                  detailName || label || segment
                ) : (
                  label || segment
                )
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
