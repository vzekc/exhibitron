import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login } from '../../test/apollo.js'

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

  graphqlTest('try making updates without being logged in', async (graphqlRequest) => {
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
    expect(result.errors![0].message).toBe('You do not have permission to update this exhibit')
  })

  graphqlTest('exhibit updates', async (graphqlRequest) => {
    const user = await login(graphqlRequest, 'daffy@example.com')
    const exhibitId = await createExhibit(graphqlRequest, { title: 'New Exhibit' }, user)

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
      expect(result.errors![0].message).toBe('You do not have permission to update this exhibit')
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

    // succeed deleting exhibit
    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteExhibit($id: Int!) {
            deleteExhibit(id: $id)
          }
        `),
        { id: exhibitId },
        user,
      )
      expect(result.errors).toBeUndefined()
    }

    // check that exhibit is deleted
    {
      const result = await graphqlRequest(
        graphql(`
          query GetExhibit($id: Int!) {
            getExhibit(id: $id) {
              id
            }
          }
        `),
        { id: exhibitId },
      )
      expect(result.errors![0].message).toMatch(/^Exhibit not found/)
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

  graphqlTest(
    'returns HTML content from document when querying text field',
    async (graphqlRequest) => {
      const exhibitor = await login(graphqlRequest, 'daffy@example.com')

      // Create HTML content with distinctive formatting
      const htmlContent = '<p><strong>Formatted</strong> exhibit content with <em>styling</em></p>'

      // Create an exhibit with this HTML content
      const id = await createExhibit(
        graphqlRequest,
        {
          title: 'HTML Test Exhibit',
          text: htmlContent,
        },
        exhibitor,
      )

      // Query the exhibit and verify text field returns the HTML content
      const result = await graphqlRequest(
        graphql(`
          query GetExhibitText($id: Int!) {
            getExhibit(id: $id) {
              id
              title
              text
            }
          }
        `),
        { id },
      )

      expect(result.errors).toBeUndefined()
      expect(result.data!.getExhibit!.text).toBe(htmlContent)

      // Also test that an exhibit without a Document entity returns empty string
      const emptyId = await createExhibit(
        graphqlRequest,
        {
          title: 'Empty HTML Test Exhibit',
          // No text provided, so no Document entity will be created
        },
        exhibitor,
      )

      const emptyResult = await graphqlRequest(
        graphql(`
          query GetEmptyExhibitText($id: Int!) {
            getExhibit(id: $id) {
              id
              title
              text
            }
          }
        `),
        { id: emptyId },
      )

      expect(emptyResult.errors).toBeUndefined()
      expect(emptyResult.data!.getExhibit!.text).toBe('')
    },
  )
})
