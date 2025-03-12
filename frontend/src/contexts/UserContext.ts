import client from '../apolloClient'
import { createContext, useContext } from 'react'
import { graphql } from 'gql.tada'

export const fetchCurrentUser = async () => {
  const result = await client.query({
    query: graphql(`
      query GetCurrentUser {
        getCurrentUser {
          id
          email
          fullName
          isAdministrator
          nickname
          contacts {
            email
            mastodon
            phone
            website
          }
        }
      }
    `),
    variables: {},
  })
  return result.data!.getCurrentUser
}

export type User = Awaited<ReturnType<typeof fetchCurrentUser>>

export interface UserContextType {
  user: User | undefined
  reloadUser: () => Promise<void>
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
