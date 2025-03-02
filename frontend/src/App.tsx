// App.tsx
import { Route, Routes } from 'react-router-dom'
import '@picocss/pico/css/pico.min.css'
import Exhibits from './pages/Exhibits.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import Home from './pages/Home.tsx'
import Schedule from './pages/Schedule.tsx'
import Exhibit from './components/Exhibit.tsx'
import Bookmarks from './pages/Bookmarks.tsx'
import TableSearchResult from './components/TableSearchResult.tsx'
import Profile from './pages/Profile.tsx'
import Register from './pages/Register.tsx'
import RegistrationList from './pages/admin/RegistrationList.tsx'
import RegistrationDetails from './pages/admin/RegistrationDetails.tsx'
import MainLayout from './components/MainLayout.tsx'
import './App.css'
import NotFound from './pages/NotFound.tsx'
import RequestPasswordReset from './pages/RequestPasswordReset.tsx'
import ResetPassword from './pages/ResetPassword.tsx'

const App = () => {
  return (
    <main className="container">
      <ErrorBoundary
        fallback={
          <p style={{ color: 'red' }}>
            Irgendwas ist schief gegangen - Versuch's noch mal!
          </p>
        }>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/exhibit" element={<Exhibits />} />
            <Route path="/exhibit/:id" element={<Exhibit />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/table/:id" element={<TableSearchResult />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/requestPasswordReset"
              element={<RequestPasswordReset />}
            />
            <Route path="/resetPassword" element={<ResetPassword />} />
            <Route path="/admin/registration" element={<RegistrationList />} />
            <Route
              path="/admin/registration/:id"
              element={<RegistrationDetails />}
            />
            <Route path="/*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </main>
  )
}

export default App
