import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import '@picocss/pico/css/pico.min.css'
import ExhibitList from './components/ExhibitList.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import NavBar from './components/NavBar.tsx'
import Home from './components/Home.tsx'
import Schedule from './components/Schedule.tsx'
import { Suspense } from 'react'
import Exhibit from './components/Exhibit.tsx'
import Bookmarks from './components/Bookmarks.tsx'
import TableSearchResult from './components/TableSearchResult.tsx'
import { UserProvider } from './contexts/UserContext.tsx'

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
              <Route path="/exhibits" element={<ExhibitList />} />
              <Route path="/exhibit/:id" element={<Exhibit />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/table/:id" element={<TableSearchResult />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </UserProvider>
    </Suspense>
  </Router>
)

export default App
