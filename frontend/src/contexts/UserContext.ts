import client from '../apolloClient'
import { createContext, useContext } from 'react'
import { graphql, TadaDocumentNode } from 'gql.tada'
import { GraphQLFormattedError } from 'graphql'
import { OperationVariables } from '@apollo/client'

type GqlFetchResult<TData> = {
  data?: TData
  errors?: readonly GraphQLFormattedError[]
}

const doQuery = async <TData, TVariables extends OperationVariables>(
  query: TadaDocumentNode<TData, TVariables>,
  variables?: TVariables
): Promise<GqlFetchResult<TData>> => {
  const result = await client.query<TData, TVariables>({
    query,
    variables
  })
  return result as GqlFetchResult<TData>
}

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
    variables: {}
  })
  return result.data?.getCurrentUser
}

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
