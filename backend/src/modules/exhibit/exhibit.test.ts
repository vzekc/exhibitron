import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import {
  ExecuteOperationFunction,
  graphqlTest,
  login,
} from '../../test/apollo.js'

const createExhibit = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { title: string; table?: number; text?: string },
  session: { userId: number },
) => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateExhibit($title: String!, $table: Int, $text: String) {
        createExhibit(title: $title, table: $table, text: $text) {
          id
        }
      }
    `),
    input,
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createExhibit!.id
}

describe('exhibit', () => {
  graphqlTest('list all exhibits', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetExhibits {
          getExhibits {
            id
            exhibitor {
              id
              user {
                id
              }
            }
          }
        }
      `),
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getExhibits).toHaveLength(4)
  })

  graphqlTest(
    'try making updates without being logged in',
    async (graphqlRequest) => {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateExhibit($id: Int!, $table: Int) {
            updateExhibit(id: $id, table: $table) {
              id
            }
          }
        `),
        { id: 1001, table: 1 },
      )
      expect(result.errors![0].message).toBe(
        'You do not have permission to update this exhibit',
      )
    },
  )

  graphqlTest('exhibit updates', async (graphqlRequest) => {
    const user = await login(graphqlRequest, 'daffy@example.com')
    const exhibitId = await createExhibit(
      graphqlRequest,
      { title: 'New Exhibit' },
      user,
    )

    // succeed
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateExhibit($id: Int!, $table: Int) {
            updateExhibit(id: $id, table: $table) {
              id
              table {
                number
              }
            }
          }
        `),
        { id: exhibitId, table: 1 },
        user,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateExhibit!.table!.number).toBe(1)
    }

    // reject update of exhibit by different user
    const user2 = await login(graphqlRequest, 'donald@example.com')
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateExhibit($id: Int!, $table: Int) {
            updateExhibit(id: $id, table: $table) {
              id
            }
          }
        `),
        { id: exhibitId, table: 1 },
        user2,
      )
      expect(result.errors![0].message).toBe(
        'You do not have permission to update this exhibit',
      )
    }

    // succeed updating own exhibit to free table
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateExhibit($id: Int!, $table: Int) {
            updateExhibit(id: $id, table: $table) {
              id
              table {
                number
              }
            }
          }
        `),
        { id: exhibitId, table: 2 },
        user,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateExhibit!.table!.number).toBe(2)
    }
  })

  graphqlTest('nonexistent exhibit', async (graphqlRequest) => {
    {
      const result = await graphqlRequest(
        graphql(`
          query GetExhibit($id: Int!) {
            getExhibit(id: $id) {
              id
            }
          }
        `),
        { id: 3456 },
      )
      expect(result.errors![0].message).toMatch(/^Exhibit not found/)
    }

    {
      const result = await graphqlRequest(
        graphql(`
          query GetExhibit($id: Int!) {
            getExhibit(id: $id) {
              id
            }
          }
        `),
        { id: 1234 },
      )
      expect(result.errors![0].message).toMatch(/^Exhibit not found/)
    }
  })
})
