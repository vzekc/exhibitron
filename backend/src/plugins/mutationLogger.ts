import { ApolloServerPlugin } from '@apollo/server'
import { GraphQLFormattedError } from 'graphql'
import { Context } from '../app/context.js'
import { mutationLogger } from '../app/logger.js'

// Function to truncate long string arguments and redact sensitive data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const truncateValue = (value: any, maxLength = 100): any => {
  if (typeof value === 'string' && value.length > maxLength) {
    return value.substring(0, maxLength) + '...'
  } else if (Array.isArray(value)) {
    return value.map((item) => truncateValue(item, maxLength))
  } else if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === 'password' ? '***REDACTED***' : truncateValue(v, maxLength),
      ]),
    )
  } else {
    return value
  }
}

export const mutationLoggerPlugin = (): ApolloServerPlugin => {
  return {
    async requestDidStart(requestContext) {
      const { query, operationName, variables } = requestContext.request

      const isMutation = query?.startsWith('mutation')
      if (!isMutation) {
        return
      }

      const { user } = requestContext.contextValue as Context

      return {
        async willSendResponse(context) {
          // Handle different response formats
          const truncatedVariables = truncateValue(variables || {})
          let errors: readonly GraphQLFormattedError[] | undefined

          if (context.response.body.kind === 'single') {
            errors = context.response.body.singleResult.errors
          }

          mutationLogger.info({
            timestamp: new Date().toISOString(),
            user: user?.email || 'anonymous',
            operationName,
            variables: truncatedVariables,
            errors,
          })
        },
      }
    },
  }
}
