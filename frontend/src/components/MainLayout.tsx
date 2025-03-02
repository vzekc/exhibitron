// MainLayout.tsx
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.tsx'
import { UserProvider } from '../contexts/UserProvider.tsx'
import { ExhibitionDataProvider } from '../contexts/ExhibitionDataProvider.tsx'
import { BreadcrumbProvider } from '../contexts/BreadcrumbProvider.tsx'

const MainLayout = () => {
  return (
    <UserProvider>
      <ExhibitionDataProvider>
        <BreadcrumbProvider>
          <main className="container">
            <NavBar />
            <Outlet />
          </main>
        </BreadcrumbProvider>
      </ExhibitionDataProvider>
    </UserProvider>
  )
}

export default MainLayout
