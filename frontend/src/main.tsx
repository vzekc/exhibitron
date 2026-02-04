import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/fonts/lato.css'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import client from './apolloClient.ts'
import { ExhibitionProvider } from './contexts/ExhibitionProvider.tsx'

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
