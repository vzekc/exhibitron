// App.tsx
import { useRoutes } from 'react-router-dom'
import ErrorBoundary from '@components/ErrorBoundary.tsx'
import routes from './routes.tsx'
import BuildInfo from '@components/BuildInfo.tsx'

const App = () => {
  const element = useRoutes(routes)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="text-gray-900 dark:text-gray-100">
        <ErrorBoundary
          fallback={
            <p className="p-4 text-red-600 dark:text-red-400">
              Irgendwas ist schief gegangen - Versuch's noch mal!
            </p>
          }>
          {element}
        </ErrorBoundary>
      </main>
      <footer>
        <BuildInfo />
      </footer>
    </div>
  )
}

export default App
