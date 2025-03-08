import { expect, test } from 'vitest'
import { gql } from 'graphql-tag'
import { ExecuteOperationFunction, graphqlTest } from '../../test/apollo.js'

const login = async (
  graphqlRequest: ExecuteOperationFunction,
  email: string,
  password: string = 'geheim',
) => {
  const result = await graphqlRequest(
    gql`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          id
          email
        }
      }
    `,
    { email, password: password },
  )
  expect(result.errors).toBeUndefined()
  return { userId: result.data.login.id as number }
}

const getUserToExhibitorMap = async (
  graphqlRequest: ExecuteOperationFunction,
) => {
  const result = await graphqlRequest(gql`
    query GetExhibitors {
      getExhibitors {
        id
        user {
          id
        }
      }
    }
  `)
  return new Map<number, number>(
    result.data.getExhibitors.map(({ id, user: { id: userId } }) => [
      userId,
      id,
    ]),
  )
}

graphqlTest('claim and release', async (graphqlRequest) => {
  const userToExhibitorMap = await getUserToExhibitorMap(graphqlRequest)
  const donald = await login(graphqlRequest, 'donald@example.com')
  const daffy = await login(graphqlRequest, 'daffy@example.com')
  const admin = await login(graphqlRequest, 'admin@example.com')

  // verify table can be claimed
  let result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()
  // verify that it can be claimed again
  result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()

  // verify that daffy cannot claim donald's table
  result = await graphqlRequest(
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
    daffy,
  )
  expect(result.errors[0].message).toBe(
    'The requested table is assigned to another exhibitor',
  )

  // verify that daffy cannot release donald's table
  result = await graphqlRequest(
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
    daffy,
  )
  expect(result.errors[0].message).toBe(
    'Cannot release table claimed by another exhibitor',
  )

  // verify that table can be released
  result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()

  // expect that daffy can claim the table now
  result = await graphqlRequest(
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
    daffy,
  )
  expect(result.errors).toBeUndefined()

  // verify that admin can release daffy's table
  result = await graphqlRequest(
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
    admin,
  )
  expect(result.errors).toBeUndefined()

  // expect that donald can claim the table now
  result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()

  // Have administrator assign table 2 to donald
  result = await graphqlRequest(
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
    { number: 2, exhibitorId: userToExhibitorMap.get(donald.userId) },
    admin,
  )
  expect(result.errors).toBeUndefined()

  // expect that daffy cannot claim the table now
  result = await graphqlRequest(
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
    daffy,
  )
  expect(result.errors[0].message).toBe(
    'The requested table is assigned to another exhibitor',
  )

  // expect that donald can claim the table now (already owns it)
  result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()

  // expect that the table is reported as free
  result = await graphqlRequest(
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
  )
  expect(result.errors).toBeUndefined()
  expect(result.data.getTable.exhibitor).toBeNull()

  // expect that donald can claim the table
  result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()

  // check that donald is now the owner of the table
  result = await graphqlRequest(
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
  )
  expect(result.errors).toBeUndefined()
  expect(result.data.getTable.exhibitor.user.id).toBe(donald.userId)

  // check that a nonexistent table is correctly reported
  result = await graphqlRequest(
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
  )
  expect(result.errors[0].message).toMatch(/Table not found/)

  const getFreeTables = async () => {
    const result = await graphqlRequest(
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
    )
    expect(result.errors).toBeUndefined()
    return result.data.getTables
      .filter(({ exhibitor }) => !exhibitor)
      .map(({ number }) => number)
      .sort()
  }

  // check free list handling
  const [firstFreeTable, ...remainingFreeTables] = await getFreeTables()

  // claim first free table
  result = await graphqlRequest(
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
    donald,
  )
  expect(result.errors).toBeUndefined()

  expect(await getFreeTables()).toEqual(remainingFreeTables)
})
