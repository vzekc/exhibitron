import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

const AdminProtectedRoute = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // If no user is logged in, redirect to login page with current path as redirectUrl
    if (!user) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirectUrl=${encodeURIComponent(currentPath)}`, { replace: true })
    } else if (!user.isAdministrator) {
      // If user is logged in but not an admin, redirect to home
      navigate('/', { replace: true })
    }
  }, [user, navigate, location])

  // Only render the outlet if user is an admin
  return user && user.isAdministrator ? <Outlet /> : null
}

export default AdminProtectedRoute
