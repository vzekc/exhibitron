import client from '@apolloClient'
import { createContext, useContext } from 'react'
import { graphql } from 'gql.tada'

export const fetchCurrentExhibition = async () => {
  const result = await client.query({
    query: graphql(`
      query GetCurrentExhibitionForContext {
        getCurrentExhibition {
          id
          key
          title
          frozen
          location
          startDate
          endDate
        }
      }
    `),
    variables: {},
    fetchPolicy: 'network-only',
  })
  return result.data!.getCurrentExhibition
}

export type Exhibition = NonNullable<Awaited<ReturnType<typeof fetchCurrentExhibition>>>

export interface ExhibitionContextType {
  exhibition: Exhibition | undefined
}

export const ExhibitionContext = createContext<ExhibitionContextType | undefined>(undefined)

export const useExhibition = () => {
  const context = useContext(ExhibitionContext)
  if (!context) {
    throw new Error('useExhibition must be used within an ExhibitionProvider')
  }
  return context
}
