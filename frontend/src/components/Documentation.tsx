import { useQuery } from '@apollo/client'
import React from 'react'
import Article from './Article'
import ServerHtmlContent from './ServerHtmlContent'
import LoadInProgress from './LoadInProgress'
import { graphql } from 'gql.tada'

const GET_DOCUMENTATION = graphql(`
  query GetDocumentation($name: String!) {
    doc(name: $name) {
      id
      name
      content
    }
  }
`)

interface DocumentationProps {
  name: string
}

const Documentation: React.FC<DocumentationProps> = ({ name }) => {
  const { loading, error, data } = useQuery(GET_DOCUMENTATION, {
    variables: { name },
  })

  if (loading) return <LoadInProgress />
  if (error) return <div className="text-red-600 dark:text-red-400">Fehler: {error.message}</div>

  if (!data?.doc) {
    return <div className="text-gray-900 dark:text-gray-100">Dokumentation nicht gefunden</div>
  }

  return (
    <Article>
      <ServerHtmlContent html={data.doc.content} />
    </Article>
  )
}

export default Documentation
