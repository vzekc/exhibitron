import { Route, Routes, useLocation } from 'react-router-dom'
import '@picocss/pico/css/pico.min.css'
import Exhibits from './pages/Exhibits.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import NavBar from './components/NavBar.tsx'
import Home from './pages/Home.tsx'
import Schedule from './pages/Schedule.tsx'
import { Suspense } from 'react'
import Exhibit from './components/Exhibit.tsx'
import Bookmarks from './pages/Bookmarks.tsx'
import TableSearchResult from './components/TableSearchResult.tsx'
import { UserProvider } from './contexts/UserContext.tsx'
import Profile from './pages/Profile.tsx'
import './App.css'
import Register from './pages/Register.tsx'
import RegistrationList from './pages/admin/RegistrationList.tsx'
import RegistrationDetails from './pages/admin/RegistrationDetails.tsx'
import { BreadcrumbProvider } from './components/BreadcrumbContext.tsx'

const App = () => {
  const location = useLocation()

  return (
    <Suspense fallback={<p>Laden...</p>}>
      <UserProvider>
        <BreadcrumbProvider>
          <main className="container">
            {location.pathname !== '/register' && <NavBar />}
            <ErrorBoundary
              fallback={
                <p style={{ color: 'red' }}>
                  Irgendwas ist schief gegangen - Versuch's noch mal!
                </p>
              }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/exhibit" element={<Exhibits />} />
                <Route path="/exhibit/:id" element={<Exhibit />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/table/:id" element={<TableSearchResult />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/admin/registration"
                  element={<RegistrationList />}
                />
                <Route
                  path="/admin/registration/:id"
                  element={<RegistrationDetails />}
                />
              </Routes>
            </ErrorBoundary>
          </main>
        </BreadcrumbProvider>
      </UserProvider>
    </Suspense>
  )
}
export default App
