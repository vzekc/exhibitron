import { Link, useLocation } from 'react-router-dom'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import { useExhibition } from '@contexts/ExhibitionContext.ts'

const breadcrumbMap: { [key: string]: string } = {
  '/exhibit': 'Exponate',
  '/exhibitor': 'Mitwirkende',
  '/table': 'Tische',
  '/schedule': 'Zeitplan',
  '/bookmarks': 'Lesezeichen',
  '/lan': 'LAN',
  '/user/profile': 'Profil',
  '/user/account': 'Konto',
  '/user/exhibit': 'Deine Exponate',
  '/user/exhibitorInfo': 'Infos für Mitwirkende',
  '/user/help': 'Hilfe',
  '/admin': 'Verwaltung',
  '/admin/page': 'Seiten',
  '/admin/registration': 'Anmeldungen',
  '/admin/tableLabels': 'Tisch-Labels',
  '/admin/emailExhibitors': 'E-Mail an Mitwirkende',
  '/admin/welcomePdf': 'Willkommens-PDF',
  '/resetPassword': 'Passwort zurücksetzen',
  '/setupExhibitor': 'Registrierung abschließen',
  '/help': 'Hilfe',
}

const Breadcrumbs = () => {
  const location = useLocation()
  const { detailNames } = useBreadcrumb()
  const { exhibition } = useExhibition()

  const exhibitionKey = exhibition?.key?.toUpperCase() ?? ''

  const getLabel = (path: string) => {
    if (path === '/') {
      return exhibitionKey
    }
    return detailNames[path] || breadcrumbMap[path] || ''
  }

  // Split the path into segments and create breadcrumb items
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.reduce<{ path: string; label: string }[]>((acc, _, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = getLabel(path)
    if (label) {
      acc.push({ path, label })
    }
    return acc
  }, [])

  // Always include the home breadcrumb
  breadcrumbs.unshift({ path: '/', label: getLabel('/') })

  return (
    <nav aria-label="breadcrumb" className="text-sm">
      <ol className="flex">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          return (
            <li key={item.path} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-500">/</span>}
              {isLast ? (
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-500">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-blue-600">
                  {item.label}
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
