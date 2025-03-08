import { graphqlTest } from '../../test/apollo.js'
import { expect } from 'vitest'
import { gql } from 'graphql-tag'

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
  expect(response.errors).toBeUndefined()
  expect(response.data).toStrictEqual({
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
