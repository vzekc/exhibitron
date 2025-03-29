import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const AdminProtectedRoute = () => {
  const { exhibitor } = useExhibitor()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // If no user is logged in, redirect to login page with current path as redirectUrl
    if (!exhibitor) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirectUrl=${encodeURIComponent(currentPath)}`, { replace: true })
    } else if (!exhibitor.user.isAdministrator) {
      // If user is logged in but not an admin, redirect to home
      navigate('/', { replace: true })
    }
  }, [exhibitor, navigate, location])

  // Only render the outlet if user is an admin
  return exhibitor && exhibitor.user.isAdministrator ? <Outlet /> : null
}

export default AdminProtectedRoute
