export { createTestServer } from '../app/graphql.js'

import { createTestServer } from '../app/graphql.js'
import { ApolloServer } from '@apollo/server'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { Services } from '../db.js'
import { Context } from '../app/context.js'
import { createContext } from '../app/context.js'
import { FastifyRequest } from 'fastify'
import { FastifyReply } from 'fastify/types/reply.js'
import { RequestContext } from '@mikro-orm/core'
import { createTestDatabase, deleteDatabase } from './utils.js'
import { TadaDocumentNode } from 'gql.tada'

let db: Services
let server: ApolloServer<Context>

beforeAll(async () => {
  db = await createTestDatabase()
  server = await createTestServer()
})

afterAll(async () => {
  await server.stop()
  await db.orm.close()
  deleteDatabase(db.dbName!)
})

type Session = {
  userId?: number
}

type GqlFetchResult<TData> = {
  data?: TData
  errors?: Error[]
}

export type ExecuteOperationFunction = <TData, TVariables>(
  query: TadaDocumentNode<TData, TVariables>,
  variables?: TVariables,
  session?: Session,
) => Promise<GqlFetchResult<TData>>

export const graphqlTest = (
  name: string,
  fn: (executeOperation: ExecuteOperationFunction) => Promise<void>,
) => {
  test(name, async () => {
    await RequestContext.create(db.em, async () => {
      const executeOperation = async <TData, TVariables>(
        query: TadaDocumentNode<TData, TVariables>,
        variables?: TVariables,
        session = {},
      ) => {
        const result = await server.executeOperation(
          {
            query,
            variables: variables || {},
          },
          {
            contextValue: await createContext(
              { session, hostname: 'localhost' } as FastifyRequest,
              {} as FastifyReply,
            ),
          },
        )
        expect(result.body.kind).toBe('single')
        if (result.body.kind !== 'single') {
          throw new Error('expected single result')
        }

        return JSON.parse(JSON.stringify(result.body.singleResult))
      }
      await fn(executeOperation)
    })
  })
}
