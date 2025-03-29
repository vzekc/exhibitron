// MainLayout.tsx
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.tsx'
import { ExhibitorProvider } from '@contexts/ExhibitorProvider.tsx'
import { BreadcrumbProvider } from '@contexts/BreadcrumbProvider.tsx'

const MainLayout = () => {
  return (
    <div className="ml-6 mr-6">
      <ExhibitorProvider>
        <BreadcrumbProvider>
          <NavBar />
          <Outlet />
        </BreadcrumbProvider>
      </ExhibitorProvider>
    </div>
  )
}

export default MainLayout
