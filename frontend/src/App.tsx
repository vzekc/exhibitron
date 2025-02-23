import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
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

const App = () => (
  <Router>
    <Suspense fallback={<p>Laden...</p>}>
      <UserProvider>
        <main className="container">
          <NavBar />
          <ErrorBoundary
            fallback={
              <p style={{ color: 'red' }}>
                Irgendwas ist schief gegangen - Versuch's noch mal!
              </p>
            }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/exhibits" element={<Exhibits />} />
              <Route path="/exhibit/:id" element={<Exhibit />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/table/:id" element={<TableSearchResult />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </UserProvider>
    </Suspense>
  </Router>
)

export default App
