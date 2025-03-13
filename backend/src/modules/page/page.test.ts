import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import {
  ExecuteOperationFunction,
  graphqlTest,
  login,
} from '../../test/apollo.js'

const createPage = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { key: string; title: string; text: string },
  session: { userId: number },
) => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreatePage($key: String!, $title: String!, $text: String!) {
        createPage(key: $key, title: $title, text: $text) {
          id
        }
      }
    `),
    input,
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createPage!.id
}

describe('page', () => {
  graphqlTest('list all pages', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetPages {
          getCurrentExhibition {
            id
            pages {
              id
              key
              title
              text
            }
          }
        }
      `),
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getCurrentExhibition!.pages).toHaveLength(2)
  })

  graphqlTest('create and update page', async (graphqlRequest) => {
    const admin = await login(graphqlRequest, 'admin@example.com')
    const pageId = await createPage(
      graphqlRequest,
      { key: 'about', title: 'About', text: 'About the exhibition' },
      admin,
    )

    // succeed updating the page
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdatePage($id: Int!, $key: String!, $text: String!) {
            updatePage(id: $id, key: $key, text: $text) {
              id
              key
              title
              text
            }
          }
        `),
        { id: pageId, key: 'about', text: 'Updated about text' },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updatePage!.text).toBe('Updated about text')
    }
  })

  graphqlTest('delete page', async (graphqlRequest) => {
    const admin = await login(graphqlRequest, 'admin@example.com')
    const pageId = await createPage(
      graphqlRequest,
      { key: 'contact', title: 'Contact', text: 'Contact information' },
      admin,
    )

    // succeed deleting the page
    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeletePage($id: Int!) {
            deletePage(id: $id)
          }
        `),
        { id: pageId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.deletePage).toBe(true)
    }
  })
})
