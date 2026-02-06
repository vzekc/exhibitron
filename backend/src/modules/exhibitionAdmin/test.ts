import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { graphqlTest, login } from '../../test/server.js'

describe('exhibition admin', () => {
  graphqlTest(
    'exhibition admin can perform exhibition-scoped operations',
    async (graphqlRequest) => {
      const exadmin = await login('exadmin@example.com')

      const result = await graphqlRequest(
        graphql(`
          query GetRegistrations {
            getRegistrations {
              id
            }
          }
        `),
        {},
        exadmin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data?.getRegistrations).toBeInstanceOf(Array)
    },
  )

  graphqlTest(
    'exhibition admin cannot perform global-only operations',
    async (graphqlRequest) => {
      const exadmin = await login('exadmin@example.com')

      const result = await graphqlRequest(
        graphql(`
          query GetUsers {
            getUsers {
              id
            }
          }
        `),
        {},
        exadmin,
      )
      expect(result.errors).toBeDefined()
      expect(result.errors![0].message).toBe(
        'You must be an administrator to perform this operation',
      )
    },
  )

  graphqlTest(
    'regular user still cannot perform admin operations',
    async (graphqlRequest) => {
      const donald = await login('donald@example.com')

      const result = await graphqlRequest(
        graphql(`
          query GetRegistrations {
            getRegistrations {
              id
            }
          }
        `),
        {},
        donald,
      )
      expect(result.errors).toBeDefined()
      expect(result.errors![0].message).toBe(
        'You must be an administrator to perform this operation',
      )
    },
  )

  graphqlTest('global admin still works for all operations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')

    {
      const result = await graphqlRequest(
        graphql(`
          query GetRegistrations {
            getRegistrations {
              id
            }
          }
        `),
        {},
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data?.getRegistrations).toBeInstanceOf(Array)
    }

    {
      const result = await graphqlRequest(
        graphql(`
          query GetUsers {
            getUsers {
              id
            }
          }
        `),
        {},
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data?.getUsers).toBeInstanceOf(Array)
    }
  })
})
