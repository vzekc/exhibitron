import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const ProtectedRoute = () => {
  const { exhibitor } = useExhibitor()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // If no user is logged in, redirect to login page with current path as redirectUrl
    if (!exhibitor) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirectUrl=${encodeURIComponent(currentPath)}`, { replace: true })
    }
  }, [exhibitor, navigate, location])

  // Only render the outlet if user is logged in
  return exhibitor ? <Outlet /> : null
}

export default ProtectedRoute
