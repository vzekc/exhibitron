// App.tsx
import { useRoutes } from 'react-router-dom'
import ErrorBoundary from '@components/ErrorBoundary.tsx'
import routes from './routes.tsx'
import BuildInfo from '@components/BuildInfo.tsx'

const App = () => {
  const element = useRoutes(routes)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-8">
        <ErrorBoundary
          fallback={
            <p className="p-4 text-red-600">Irgendwas ist schief gegangen - Versuch's noch mal!</p>
          }>
          {element}
        </ErrorBoundary>
      </main>
      <footer className="border-t border-gray-200 bg-white">
        <BuildInfo />
      </footer>
    </div>
  )
}

export default App
