import { graphqlTest } from '../../test/apollo.js'
import { expect } from 'vitest'
import { graphql } from 'gql.tada'

graphqlTest('test graphql', async (executeOperation) => {
  const response = await executeOperation(
    graphql(`
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
    `),
    { number: 1 },
  )
  expect(response.errors).toBeUndefined()
  expect(response.data).toStrictEqual({
    getTable: {
      id: 1,
      number: 1,
      exhibitor: null,
    },
  })
  expect(response.data?.getTable?.exhibitor).toBeNull()
})
