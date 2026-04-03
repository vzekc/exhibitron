import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const ProtectedRoute = () => {
  const { currentUser } = useExhibitor()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!currentUser) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirectUrl=${encodeURIComponent(currentPath)}`, { replace: true })
    }
  }, [currentUser, navigate, location])

  return currentUser ? <Outlet /> : null
}

export default ProtectedRoute
