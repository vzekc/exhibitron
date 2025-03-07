import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { deleteDatabase, initTestApp, login } from '../../test/utils.js'
import { graphql, TadaDocumentNode } from 'gql.tada'
import { gql } from 'graphql-tag'

let app: FastifyInstance
let dbName: string

beforeAll(async () => {
  ;({ app, dbName } = await initTestApp())
})

afterAll(async () => {
  // we close only the fastify app - it will close the database connection via onClose hook automatically
  await app.close()
  deleteDatabase(dbName)
})

type GraphQLRequestVariables<T> = T extends { variables: infer V } ? V : never
type GraphQLRequestResponse<T> = T extends { response: infer R } ? R : never

const graphqlRequest = async <T extends TadaDocumentNode>(
  app: FastifyInstance,
  query: T,
  variables: GraphQLRequestVariables<T>,
  token?: string,
): Promise<GraphQLRequestResponse<T>> => {
  const res = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    payload: {
      query,
      variables,
    },
  })

  expect(res).toHaveStatus(200)
  return res.json().data as GraphQLRequestResponse<T>
}

test('claim and release', async () => {
  const donald = await login(app, 'donald@example.com')
  const daffy = await login(app, 'daffy@example.com')
  const admin = await login(app, 'admin@example.com')

  // verify table can be claimed
  let res = await graphqlRequest(
    app,
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    donald.token,
  )
  expect(res).toHaveStatus(200)

  // verify that it can be claimed again
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    donald.token,
  )
  expect(res).toHaveStatus(200)

  // verify that daffy cannot claim donald's table
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    daffy.token,
  )
  expect(res).toHaveStatus(403)

  // verify that daffy cannot release donald's table
  res = await graphqlRequest(
    gql`
      mutation ReleaseTable($number: Int!) {
        releaseTable(number: $number) {
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
    daffy.token,
  )
  expect(res).toHaveStatus(403)

  // verify that table can be released
  res = await graphqlRequest(
    gql`
      mutation ReleaseTable($number: Int!) {
        releaseTable(number: $number) {
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
    donald.token,
  )
  expect(res).toHaveStatus(200)

  // expect that daffy can claim the table now
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    daffy.token,
  )
  expect(res).toHaveStatus(200)

  // verify that admin can release daffy's table
  res = await graphqlRequest(
    gql`
      mutation ReleaseTable($number: Int!) {
        releaseTable(number: $number) {
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
    admin.token,
  )
  expect(res).toHaveStatus(200)

  // expect that donald can claim the table now
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    donald.token,
  )
  expect(res).toHaveStatus(200)

  // Have administrator assign table 2 to donald
  res = await graphqlRequest(
    gql`
      mutation AssignTable($number: Int!, $exhibitorId: Int!) {
        assignTable(number: $number, exhibitorId: $exhibitorId) {
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
    { number: 2, exhibitorId: donald.id },
    admin.token,
  )
  expect(res).toHaveStatus(200)

  // expect that daffy cannot claim the table now
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    { number: 2 },
    daffy.token,
  )
  expect(res).toHaveStatus(403)

  // expect that donald can claim the table now (already owns it)
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    { number: 2 },
    donald.token,
  )
  expect(res).toHaveStatus(200)

  // expect that the table is reported as free
  res = await graphqlRequest(
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
    { number: 7 },
    '',
  )
  expect(res).toHaveStatus(200)
  expect(res.json().data.getTable).toMatchObject({ exhibitor: null })

  // expect that donald can claim the table
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    { number: 7 },
    donald.token,
  )
  expect(res).toHaveStatus(200)

  // check that donald is now the owner of the table
  res = await graphqlRequest(
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
    { number: 7 },
    '',
  )
  expect(res).toHaveStatus(200)
  expect(res.json().data.getTable.exhibitor.user.id).toBe(donald.id)

  // check that a nonexistent table is correctly reported
  res = await graphqlRequest(
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
    { number: 2000 },
    '',
  )
  expect(res).toHaveStatus(404)

  const getFreeTables = async () => {
    const res = await graphqlRequest(
      gql`
        query GetTables {
          getTables {
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
      {},
      '',
    )
    expect(res).toHaveStatus(200)
    return res
      .json()
      .data.getTables.filter(({ exhibitor }) => !exhibitor)
      .map(({ number }) => number)
      .sort()
  }

  // check free list handling
  const [firstFreeTable, ...remainingFreeTables] = await getFreeTables()

  // claim first free table
  res = await graphqlRequest(
    gql`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
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
    { number: firstFreeTable },
    daffy.token,
  )
  expect(res).toHaveStatus(200)

  expect(await getFreeTables()).toEqual(remainingFreeTables)
})
