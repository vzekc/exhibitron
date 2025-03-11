// MainLayout.tsx
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.tsx'
import { UserProvider } from '../contexts/UserProvider.tsx'
import { BreadcrumbProvider } from '../contexts/BreadcrumbProvider.tsx'

const MainLayout = () => {
  return (
    <UserProvider>
      <BreadcrumbProvider>
        <NavBar />
        <Outlet />
      </BreadcrumbProvider>
    </UserProvider>
  )
}

export default MainLayout
