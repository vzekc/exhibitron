// src/components/Page.tsx
import { useQuery, gql } from '@apollo/client'
import React from 'react'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import Article from './Article'
import ServerHtmlContent from './ServerHtmlContent'
import PageHeading from './PageHeading'
import LoadInProgress from './LoadInProgress'

const GET_CURRENT_EXHIBITION = gql`
  query GetCurrentExhibition {
    getCurrentExhibition {
      id
      pages {
        key
        title
        html
      }
    }
  }
`

interface PageProps {
  pageKey: string
}

const Page: React.FC<PageProps> = ({ pageKey }) => {
  const { loading, error, data } = useQuery(GET_CURRENT_EXHIBITION)
  const { exhibitor } = useExhibitor()

  if (loading) return <LoadInProgress />
  if (error) return <div className="text-red-600 dark:text-red-400">Fehler: {error.message}</div>

  const page = data.getCurrentExhibition.pages.find((page: { key: string }) => page.key === pageKey)

  if (!page) {
    if (exhibitor?.user.isAdministrator) {
      return (
        <div className="text-gray-900 dark:text-gray-100">
          <p>
            Seite <strong>"{pageKey}"</strong> nicht in der Datenbank gefunden.{' '}
          </p>
          <a
            href={`/admin/page/${pageKey}`}
            className="text-blue-600 hover:underline dark:text-blue-400">
            Seite anlegen
          </a>
        </div>
      )
    } else {
      return (
        <div className="text-gray-900 dark:text-gray-100">
          Seite nicht in der Datenbank gefunden
        </div>
      )
    }
  }

  return (
    <Article>
      <PageHeading>{page.title}</PageHeading>
      <ServerHtmlContent html={page.html} />
    </Article>
  )
}

export default Page
