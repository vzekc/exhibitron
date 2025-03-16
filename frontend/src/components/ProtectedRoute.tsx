import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

const ProtectedRoute = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // If no user is logged in, redirect to login page with current path as redirectUrl
    if (!user) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirectUrl=${encodeURIComponent(currentPath)}`, { replace: true })
    }
  }, [user, navigate, location])

  // Only render the outlet if user is logged in
  return user ? <Outlet /> : null
}

export default ProtectedRoute
