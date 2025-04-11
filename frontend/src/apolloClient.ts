import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'

const httpLink = createHttpLink({
  uri: '/graphql',
  fetchOptions: {
    credentials: 'same-origin',
  },
  fetch: (uri, options) => {
    return fetch(uri, options).then((response) => {
      if (!response.ok) {
        return response.json().then((body) => {
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: response.headers,
          })
        })
      }
      return response
    })
  },
})

const authLink = setContext((_, { headers }) => {
  // we may not need this
  return {
    headers,
  }
})

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
    })
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
  }
})

const client = new ApolloClient({
  link: errorLink.concat(authLink).concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
})

export default client
