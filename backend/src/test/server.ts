import { createApp } from '../app.js'

import { afterAll, beforeAll, expect, test } from 'vitest'
import { initORM } from '../db.js'
import { FastifyInstance } from 'fastify'
import { RequestContext } from '@mikro-orm/core'
import { graphql, TadaDocumentNode } from 'gql.tada'
import { print } from 'graphql'
import pino from 'pino'

// @ts-expect-error ts2345
const logger = pino()

let app: FastifyInstance

beforeAll(async () => {
  app = await createApp({ migrate: false, logLevel: 'fatal' })
})

afterAll(async () => {
  await app.close()
})

export type Session = {
  userId: number
  cookie: string
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
  fn: (executeOperation: ExecuteOperationFunction, app: FastifyInstance) => Promise<void>,
) => {
  test(name, async () => {
    const db = await initORM()
    await RequestContext.create(db.em, async () => {
      const executeOperation = async <TData, TVariables>(
        query: TadaDocumentNode<TData, TVariables>,
        variables?: TVariables,
        session?: Session,
      ) => {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          host: 'localhost:3000',
        }

        if (session?.cookie) {
          headers.cookie = session.cookie
        }

        const response = await app.inject({
          method: 'POST',
          url: '/graphql',
          payload: JSON.stringify({
            query: print(query),
            variables: variables || {},
          }),
          headers,
        })

        const result = JSON.parse(response.payload)
        if (response.statusCode !== 200) {
          logger.debug('GraphQL Error:', response.payload)
        }

        return result
      }
      await fn(executeOperation, app)
    })
  })
}

export const login = async (email: string, password: string = 'geheim'): Promise<Session> => {
  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    payload: JSON.stringify({
      query: print(
        graphql(`
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              id
              email
            }
          }
        `),
      ),
      variables: { email, password },
    }),
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
    },
  })

  const result = JSON.parse(response.payload)
  expect(response.statusCode).toBe(200)
  expect(result.errors).toBeUndefined()

  const setCookie = response.headers['set-cookie']
  expect(setCookie).toBeDefined()
  if (!setCookie || setCookie.length === 0) {
    throw new Error('Did not receive session cookie')
  }
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie

  return {
    userId: result.data!.login!.id,
    cookie,
  }
}
