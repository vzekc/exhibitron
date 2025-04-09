// MainLayout.tsx
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.tsx'
import { ExhibitorProvider } from '@contexts/ExhibitorProvider.tsx'
import { BreadcrumbProvider } from '@contexts/BreadcrumbProvider.tsx'
import Footer from './Footer'

const MainLayout = () => {
  return (
    <ExhibitorProvider>
      <BreadcrumbProvider>
        <NavBar />
        <Outlet />
        <Footer />
      </BreadcrumbProvider>
    </ExhibitorProvider>
  )
}

export default MainLayout
