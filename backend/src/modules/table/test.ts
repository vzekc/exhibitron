import { expect } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login } from '../../test/server.js'

const getUserToExhibitorMap = async (graphqlRequest: ExecuteOperationFunction) => {
  const result = await graphqlRequest(
    graphql(`
      query GetExhibitors {
        getCurrentExhibition {
          exhibitors {
            id
            user {
              id
            }
          }
        }
      }
    `),
  )
  return new Map<number, number>(
    result.data?.getCurrentExhibition?.exhibitors?.map(({ id, user: { id: userId } }) => [
      userId,
      id,
    ]),
  )
}

graphqlTest('claim and release', async (graphqlRequest) => {
  const userToExhibitorMap = await getUserToExhibitorMap(graphqlRequest)
  const donald = await login('donald@example.com')
  const daffy = await login('daffy@example.com')
  const admin = await login('admin@example.com')

  const releaseTables = async (tables: number[]) => {
    for (const table of tables) {
      const result = await graphqlRequest(
        graphql(`
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
        `),
        { number: table },
        admin,
      )
      expect(result.errors).toBeUndefined()
    }
  }

  // verify table can be claimed
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // verify that it can be claimed again
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // verify that daffy cannot claim donald's table
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      daffy,
    )
    expect(result.errors![0].message).toBe('The requested table is assigned to another exhibitor')
  }

  // verify that daffy cannot release donald's table
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      daffy,
    )
    expect(result.errors![0].message).toBe('Cannot release table claimed by another exhibitor')
  }

  // verify that table can be released
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // expect that daffy can claim the table now
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      daffy,
    )
    expect(result.errors).toBeUndefined()
  }

  // verify that admin can release daffy's table
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      admin,
    )
    expect(result.errors).toBeUndefined()
  }

  // expect that donald can claim the table now
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 1 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // Have administrator assign table 2 to donald
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 2, exhibitorId: userToExhibitorMap.get(donald.userId)! },
      admin,
    )
    expect(result.errors).toBeUndefined()
  }

  // expect that daffy cannot claim the table now
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 2 },
      daffy,
    )
    expect(result.errors![0].message).toBe('The requested table is assigned to another exhibitor')
  }

  // expect that donald can claim the table now (already owns it)
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 2 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  await releaseTables([1, 2])

  // expect that the unclaimed table 2 is now reported as free
  {
    const result = await graphqlRequest(
      graphql(`
        query GetTable($number: Int!) {
          getTable(number: $number) {
            id
            exhibitor {
              user {
                id
              }
            }
          }
        }
      `),
      { number: 2 },
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getTable?.exhibitor).toBeNull()
  }

  // expect that donald can claim the table
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 2 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // check that donald is now the owner of the table
  {
    const result = await graphqlRequest(
      graphql(`
        query GetTable($number: Int!) {
          getTable(number: $number) {
            id
            exhibitor {
              user {
                id
              }
            }
          }
        }
      `),
      { number: 2 },
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getTable?.exhibitor?.user.id).toBe(donald.userId)
  }

  await releaseTables([1, 2])

  // check that a nonexistent table is correctly reported
  {
    const result = await graphqlRequest(
      graphql(`
        query GetTable($number: Int!) {
          getTable(number: $number) {
            id
            exhibitor {
              user {
                id
              }
            }
          }
        }
      `),
      { number: 2000 },
    )
    expect(result.errors![0].message).toMatch(/Table not found/)
  }

  const getFreeTables = async () => {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      {},
    )
    expect(result.errors).toBeUndefined()
    return result
      .data!.getTables!.filter(({ exhibitor }) => !exhibitor)
      .map(({ number }) => number)
      .sort()
  }

  // check free list handling
  const claimNextFreeTable = async () => {
    const [firstFreeTable, ...remainingFreeTables] = await getFreeTables()

    // claim first free table
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: firstFreeTable },
      donald,
    )
    return { tableNumber: firstFreeTable, result, remainingFreeTables }
  }

  // expect that we can only claim two tables
  {
    const tables: number[] = []
    {
      const { result, remainingFreeTables, tableNumber } = await claimNextFreeTable()
      expect(result.errors).toBeUndefined()
      expect(await getFreeTables()).toEqual(remainingFreeTables)
      tables.push(tableNumber)
    }
    {
      const { result, remainingFreeTables, tableNumber } = await claimNextFreeTable()
      expect(result.errors).toBeUndefined()
      expect(await getFreeTables()).toEqual(remainingFreeTables)
      tables.push(tableNumber)

      const { result: failedResult } = await claimNextFreeTable()
      expect(failedResult.errors).toBeDefined()
      expect(failedResult.errors![0].message).toBe('You can claim at most two tables')
      expect(await getFreeTables()).toEqual(remainingFreeTables)
    }
    await releaseTables(tables)
  }
})

graphqlTest('verify transactional integrity of releaseTable', async (graphqlRequest) => {
  const donald = await login('donald@example.com')
  const daffy = await login('daffy@example.com')

  // First, have donald claim a table
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 3 },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // Create some exhibits for the table
  {
    const result = await graphqlRequest(
      graphql(`
        mutation CreateExhibit($title: String!, $table: Int) {
          createExhibit(title: $title, table: $table) {
            id
            table {
              number
            }
          }
        }
      `),
      {
        title: 'Test Exhibit 1',
        table: 3,
      },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  {
    const result = await graphqlRequest(
      graphql(`
        mutation CreateExhibit($title: String!, $table: Int) {
          createExhibit(title: $title, table: $table) {
            id
            table {
              number
            }
          }
        }
      `),
      {
        title: 'Test Exhibit 2',
        table: 3,
      },
      donald,
    )
    expect(result.errors).toBeUndefined()
  }

  // Verify the exhibits exist on the table
  {
    const result = await graphqlRequest(
      graphql(`
        query GetTable($number: Int!) {
          getTable(number: $number) {
            number
            exhibits {
              id
              title
            }
          }
        }
      `),
      { number: 3 },
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getTable?.exhibits).toHaveLength(2)
  }

  // Try to release the table as daffy (not owner or admin)
  {
    const result = await graphqlRequest(
      graphql(`
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
      `),
      { number: 3 },
      daffy,
    )
    expect(result.errors![0].message).toBe('Cannot release table claimed by another exhibitor')
  }

  // Verify that the exhibits are still assigned to the table (transaction was rolled back)
  {
    const result = await graphqlRequest(
      graphql(`
        query GetTable($number: Int!) {
          getTable(number: $number) {
            number
            exhibits {
              id
              title
            }
          }
        }
      `),
      { number: 3 },
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getTable?.exhibits).toHaveLength(2)
  }
})
