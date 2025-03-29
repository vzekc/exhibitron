// MainLayout.tsx
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.tsx'
import { ExhibitorProvider } from '@contexts/ExhibitorProvider.tsx'
import { BreadcrumbProvider } from '@contexts/BreadcrumbProvider.tsx'

const MainLayout = () => {
  return (
    <ExhibitorProvider>
      <BreadcrumbProvider>
        <NavBar />
        <Outlet />
      </BreadcrumbProvider>
    </ExhibitorProvider>
  )
}

export default MainLayout
