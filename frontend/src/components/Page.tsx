// src/components/Page.tsx
import { useQuery, gql } from '@apollo/client'
import React from 'react'

const GET_CURRENT_EXHIBITION = gql`
  query GetCurrentExhibition {
    getCurrentExhibition {
      pages {
        key
        title
        text
      }
    }
  }
`

interface PageProps {
  pageKey: string
}

const Page: React.FC<PageProps> = ({ pageKey }) => {
  const { loading, error, data } = useQuery(GET_CURRENT_EXHIBITION)

  if (loading) return <div>Lade...</div>
  if (error) return <div>Fehler: {error.message}</div>

  const page = data.getCurrentExhibition.pages.find(
    (page: { key: string }) => page.key === pageKey,
  )

  if (!page) return <div>Seite nicht in der Datenbank gefunden</div>

  return (
    <article>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.text }} />
    </article>
  )
}

export default Page
