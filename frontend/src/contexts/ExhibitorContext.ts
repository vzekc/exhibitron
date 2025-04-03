import client from '@apolloClient'
import { createContext, useContext } from 'react'
import { graphql } from 'gql.tada'

export const fetchCurrentExhibitor = async () => {
  const result = await client.query({
    query: graphql(`
      query GetCurrentExhibitor {
        getCurrentExhibitor {
          id
          topic
          canSwitchExhibitor
          user {
            id
            email
            fullName
            isAdministrator
            nickname
            profileImage
            contacts {
              email
              mastodon
              phone
              website
              youtube
            }
          }
        }
      }
    `),
    variables: {},
    fetchPolicy: 'network-only',
  })
  return result.data!.getCurrentExhibitor
}

export type Exhibitor = NonNullable<Awaited<ReturnType<typeof fetchCurrentExhibitor>>>

export interface ExhibitorContextTabe {
  exhibitor: Exhibitor | undefined
  reloadExhibitor: () => Promise<void>
}

export const ExhibitorContext = createContext<ExhibitorContextTabe | undefined>(undefined)

export const useExhibitor = () => {
  const context = useContext(ExhibitorContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
