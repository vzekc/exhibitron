// App.tsx
import { useRoutes } from 'react-router-dom'
import '@picocss/pico/css/pico.min.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import routes from './routes.tsx'
import './App.css'

const App = () => {
  const element = useRoutes(routes)

  return (
    <main className="container">
      <ErrorBoundary
        fallback={
          <p style={{ color: 'red' }}>
            Irgendwas ist schief gegangen - Versuch's noch mal!
          </p>
        }>
        {element}
      </ErrorBoundary>
    </main>
  )
}

export default App
