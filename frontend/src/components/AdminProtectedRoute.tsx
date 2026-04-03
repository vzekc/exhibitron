import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const AdminProtectedRoute = () => {
  const { currentUser } = useExhibitor()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!currentUser) {
      const currentPath = location.pathname + location.search
      navigate(`/login?redirectUrl=${encodeURIComponent(currentPath)}`, { replace: true })
    } else if (!currentUser.isAdministrator) {
      navigate('/', { replace: true })
    }
  }, [currentUser, navigate, location])

  return currentUser?.isAdministrator ? <Outlet /> : null
}

export default AdminProtectedRoute
