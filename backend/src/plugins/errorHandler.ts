import { ApolloServerPlugin } from '@apollo/server'
import { GraphQLError } from 'graphql'
import { Context } from '../app/context.js'
import { pino } from 'pino'
import { NotFoundError } from '@mikro-orm/core'
import { ErrorCode } from '../modules/common/errors.js'

const logger = pino({
  level: 'info',
  transport: {
    targets: [
      {
        target: 'pino/file',
        options: { destination: 'errors.log' },
      },
    ],
  },
})

export const errorHandlerPlugin = (): ApolloServerPlugin => {
  return {
    async requestDidStart() {
      return {
        async didEncounterErrors(context) {
          const { errors } = context
          const { user } = context.contextValue as Context

          for (const error of errors) {
            logger.error({
              timestamp: new Date().toISOString(),
              user: user?.email || 'anonymous',
              message: error.message,
              path: error.path,
              extensions: error.extensions,
            })
          }
        },
        async willSendResponse(context) {
          const response = context.response
          if (response.body.kind === 'single' && response.body.singleResult.errors) {
            const errors = response.body.singleResult.errors
            response.body.singleResult.errors = errors.map((error) => {
              const graphqlError =
                error instanceof GraphQLError
                  ? error
                  : new GraphQLError(error.message, {
                      path: error.path,
                      extensions: error.extensions,
                    })

              // Check if the error is a NotFoundError from MikroORM
              const isNotFound =
                graphqlError.originalError instanceof NotFoundError ||
                (graphqlError.message &&
                  graphqlError.message.toLowerCase().includes('not found')) ||
                (graphqlError.originalError &&
                  graphqlError.originalError.message.toLowerCase().includes('not found'))

              if (isNotFound) {
                return new GraphQLError(graphqlError.message, {
                  path: graphqlError.path,
                  extensions: {
                    code: ErrorCode.NOT_FOUND,
                    http: { status: 404 },
                  },
                })
              }
              return graphqlError
            })
          }
        },
      }
    },
  }
}

export const formatError = (error: GraphQLError) => {
  // Handle NotFoundError from MikroORM
  if (error.originalError instanceof NotFoundError) {
    return new GraphQLError(error.message, {
      extensions: {
        ...error.extensions,
        code: ErrorCode.NOT_FOUND,
        http: { status: 404 },
      },
      nodes: error.nodes,
      source: error.source,
      positions: error.positions,
      path: error.path,
      originalError: error.originalError,
    })
  }
  return error
}
