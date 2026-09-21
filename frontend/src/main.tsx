import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/fonts/lato.css'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import client from './apolloClient.ts'
import { ExhibitionProvider } from './contexts/ExhibitionProvider.tsx'
import { watchForUpdates } from './serviceWorkerUpdates.ts'
import { Buffer } from 'buffer'

// @react-pdf/layout reads the global Buffer to tell a fetched picture from a URL.
const globalScope = globalThis as { Buffer?: typeof Buffer }
if (!globalScope.Buffer) globalScope.Buffer = Buffer

watchForUpdates()

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <ExhibitionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ExhibitionProvider>
    </ApolloProvider>
  </React.StrictMode>,
)
