import { Suspense } from 'react'
import '@picocss/pico/css/pico.min.css'
import ExhibitList from './components/ExhibitList.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

const App = () => (
  <main className="container">
    <h1>Classic Computing 2025</h1>
    <ErrorBoundary
      fallback={
        <p style={{ color: 'red' }}>Something went wrong. Please try again.</p>
      }>
      <Suspense fallback={<p>Loading...</p>}>
        <ExhibitList />
      </Suspense>
    </ErrorBoundary>
  </main>
)

export default App
