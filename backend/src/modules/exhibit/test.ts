import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login, Session } from '../../test/server.js'

const createExhibit = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { title: string; table?: number; description?: string; descriptionExtension?: string },
  session: Session,
) => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateExhibit(
        $title: String!
        $table: Int
        $description: String
        $descriptionExtension: String
      ) {
        createExhibit(
          title: $title
          table: $table
          description: $description
          descriptionExtension: $descriptionExtension
        ) {
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
    const user = await login('daffy@example.com')
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
    const user2 = await login('donald@example.com')
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
        { id: 9999 },
      )
      expect(result.errors![0].message).toMatch(/^Exhibit not found/)
    }
  })

  graphqlTest(
    'returns HTML content from document when querying text field',
    async (graphqlRequest) => {
      const exhibitor = await login('daffy@example.com')

      // Create HTML content with distinctive formatting
      const htmlContent = '<p><strong>Formatted</strong> exhibit content with <em>styling</em></p>'

      // Create an exhibit with this HTML content
      const id = await createExhibit(
        graphqlRequest,
        {
          title: 'HTML Test Exhibit',
          description: htmlContent,
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
              description
            }
          }
        `),
        { id },
      )

      expect(result.errors).toBeUndefined()
      expect(result.data!.getExhibit!.description).toBe(htmlContent)

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
              description
            }
          }
        `),
        { id: emptyId },
      )

      expect(emptyResult.errors).toBeUndefined()
      expect(emptyResult.data!.getExhibit!.description).toBe('')
    },
  )

  graphqlTest('creates exhibit with descriptionExtension field', async (graphqlRequest) => {
    const exhibitor = await login('daffy@example.com')

    // Create an exhibit with both description and descriptionExtension
    const description = '<p>Main description</p>'
    const descriptionExtension = '<p>Additional <strong>information</strong> about the exhibit.</p>'

    const id = await createExhibit(
      graphqlRequest,
      {
        title: 'Exhibit with Extension',
        description,
        descriptionExtension,
      },
      exhibitor,
    )

    // Query the exhibit and verify both fields have the correct content
    const result = await graphqlRequest(
      graphql(`
        query GetExtendedExhibit($id: Int!) {
          getExhibit(id: $id) {
            id
            title
            description
            descriptionExtension
          }
        }
      `),
      { id },
    )

    expect(result.errors).toBeUndefined()
    expect(result.data!.getExhibit!.description).toBe(description)
    expect(result.data!.getExhibit!.descriptionExtension).toBe(descriptionExtension)
  })

  graphqlTest(
    'updates to description and descriptionExtension fields work',
    async (graphqlRequest) => {
      const exhibitor = await login('daffy@example.com')

      // Create an exhibit with initial content
      const initialDescription = '<p>Initial description</p>'
      const id = await createExhibit(
        graphqlRequest,
        {
          title: 'Description Update Test',
          description: initialDescription,
        },
        exhibitor,
      )

      // HTML content with an embedded image for description update
      const updatedDescription =
        '<p>Updated description with <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="Embedded test image"> embedded.</p>'

      // HTML content for descriptionExtension
      const descriptionExtension =
        '<p>Additional <strong>information</strong> about the exhibit.</p>'

      // Update both description and descriptionExtension
      const updateResult = await graphqlRequest(
        graphql(`
          mutation UpdateExhibitDescription(
            $id: Int!
            $description: String
            $descriptionExtension: String
          ) {
            updateExhibit(
              id: $id
              description: $description
              descriptionExtension: $descriptionExtension
            ) {
              id
              description
              descriptionExtension
            }
          }
        `),
        {
          id,
          description: updatedDescription,
          descriptionExtension: descriptionExtension,
        },
        exhibitor,
      )

      expect(updateResult.errors).toBeUndefined()
      // When base64 images are processed, they're replaced with URLs like /api/images/uuid
      // So we can't check for the exact HTML match, but we can check for patterns
      expect(updateResult.data!.updateExhibit!.description).toContain(
        '<p>Updated description with <img',
      )
      expect(updateResult.data!.updateExhibit!.description).toContain('alt="Embedded test image"')
      expect(updateResult.data!.updateExhibit!.description).toContain('src="/api/images/')
      expect(updateResult.data!.updateExhibit!.description).toContain('embedded.</p>')
      expect(updateResult.data!.updateExhibit!.descriptionExtension).toBe(descriptionExtension)

      // Verify that the updates are persisted by fetching the exhibit again
      const getResult = await graphqlRequest(
        graphql(`
          query GetUpdatedExhibit($id: Int!) {
            getExhibit(id: $id) {
              id
              description
              descriptionExtension
            }
          }
        `),
        { id },
      )

      expect(getResult.errors).toBeUndefined()
      // Same pattern checks as above
      expect(getResult.data!.getExhibit!.description).toContain('<p>Updated description with <img')
      expect(getResult.data!.getExhibit!.description).toContain('alt="Embedded test image"')
      expect(getResult.data!.getExhibit!.description).toContain('src="/api/images/')
      expect(getResult.data!.getExhibit!.description).toContain('embedded.</p>')
      expect(getResult.data!.getExhibit!.descriptionExtension).toBe(descriptionExtension)
    },
  )
})
