// MainLayout.tsx
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar.tsx'
import { ExhibitorProvider } from '@contexts/ExhibitorProvider.tsx'
import { BreadcrumbProvider } from '@contexts/BreadcrumbProvider.tsx'
import Footer from './Footer'
import SurveyReminder from './survey/SurveyReminder'

const MainLayout = () => {
  return (
    <ExhibitorProvider>
      <BreadcrumbProvider>
        <NavBar />
        <div className="mx-2">
          <SurveyReminder />
          <Outlet />
        </div>
        <Footer />
      </BreadcrumbProvider>
    </ExhibitorProvider>
  )
}

export default MainLayout
