import { createTestServer } from '../../test/apollo.js'
import { ApolloServer, GraphQLResponse } from '@apollo/server'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { initORM, Services } from '../../db.js'
import { Context } from '../../app/context.js'
import { gql } from 'graphql-tag'
import { createContext } from '../../app/context.js'
import { FastifyRequest } from 'fastify'
import { FastifyReply } from 'fastify/types/reply.js'
import { RequestContext } from '@mikro-orm/core'
import { DocumentNode } from 'graphql/language/index.js'

let db: Services
let server: ApolloServer<Context>

beforeAll(async () => {
  db = await initORM()
  await db.orm.migrator.up()
  server = await createTestServer()
})

afterAll(async () => {
  await server.stop()
})

type ExecuteOperationFunction = (
  query: DocumentNode,
  variables?: Record<string, unknown>,
) => Promise<GraphQLResponse>

const graphqlTest = (
  name: string,
  fn: (executeOperation: ExecuteOperationFunction) => Promise<void>,
) => {
  test(name, async () => {
    await RequestContext.create(db.em, async () => {
      const executeOperation = async (
        query: DocumentNode,
        variables?: Record<string, unknown>,
      ) =>
        server.executeOperation(
          {
            query,
            variables,
          },
          {
            contextValue: await createContext(
              { session: {} } as FastifyRequest,
              {} as FastifyReply,
            ),
          },
        )
      await fn(executeOperation)
    })
  })
}

graphqlTest('test graphql', async (executeOperation) => {
  const response = await executeOperation(
    gql`
      query GetTable($number: Int!) {
        getTable(number: $number) {
          id
          number
          exhibitor {
            user {
              id
            }
          }
        }
      }
    `,
    { number: 1 },
  )
  expect(response.body.kind).toBe('single')
  if (response.body.kind !== 'single') {
    throw new Error('expected single result')
  }
  const { singleResult } = JSON.parse(JSON.stringify(response.body))
  expect(singleResult.errors).toBeUndefined()
  expect(singleResult.data).toStrictEqual({
    getTable: {
      id: 1,
      number: 1,
      exhibitor: {
        user: {
          id: 1,
        },
      },
    },
  })
})
