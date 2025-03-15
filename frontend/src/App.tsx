// App.tsx
import { useRoutes } from 'react-router-dom'
import '@picocss/pico/css/pico.min.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import routes from './routes.tsx'
import { BuildInfo } from './components/BuildInfo'
import './App.css'

const App = () => {
  const element = useRoutes(routes)

  return (
    <div className="app-container min-h-screen flex flex-col">
      <main className="container flex-grow">
        <ErrorBoundary
          fallback={
            <p style={{ color: 'red' }}>Irgendwas ist schief gegangen - Versuch's noch mal!</p>
          }>
          {element}
        </ErrorBoundary>
      </main>
      <BuildInfo />
    </div>
  )
}

export default App
