import { createTestServer } from '../../test/apollo.js'
import { ApolloServer } from '@apollo/server'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { initORM, Services } from '../../db.js'
import { Context } from '../../app/context.js'
import { gql } from 'graphql-tag'
import { createContext } from '../../app/context.js'
import { FastifyRequest } from 'fastify'
import { FastifyReply } from 'fastify/types/reply.js'
import { RequestContext } from '@mikro-orm/core'

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

test('test graphql', async () => {
  await RequestContext.create(db.em, async () => {
    const context = await createContext(
      { session: {} } as FastifyRequest,
      {} as FastifyReply,
    )
    const response = await server!.executeOperation(
      {
        query: gql`
          query GetTable($number: Int!) {
            getTable(number: $number) {
              id
              number
              exhibitor {
                user {
                  id
                  email
                  fullName
                }
              }
            }
          }
        `,
        variables: { number: 1 },
      },
      {
        contextValue: context,
      },
    )
    expect(response.body.kind).toBe('single')
    if (response.body.kind !== 'single') {
      throw new Error('expected single result')
    }
    const { singleResult } = JSON.parse(JSON.stringify(response.body))
    expect(singleResult.errors).toBeUndefined()
    console.log(singleResult.data)
    console.log({
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
})
