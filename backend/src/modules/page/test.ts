import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login } from '../../test/apollo.js'
import { Image } from '../image/entity.js'
import { RequestContext } from '@mikro-orm/core'
import { Page } from './entity.js'

interface PageResult {
  id: number
  text: string
}

const createPage = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { key: string; title: string; text: string },
  session: { userId: number },
): Promise<PageResult> => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreatePage($key: String!, $title: String!, $text: String!) {
        createPage(key: $key, title: $title, text: $text) {
          id
          text
        }
      }
    `),
    input,
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createPage!
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
    const { id } = await createPage(
      graphqlRequest,
      { key: 'about', title: 'About', text: 'About the exhibition' },
      admin,
    )

    // succeed updating the page
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdatePage($id: Int!, $key: String!, $title: String!, $text: String!) {
            updatePage(id: $id, key: $key, title: $title, text: $text) {
              id
              key
              title
              text
            }
          }
        `),
        {
          id,
          key: 'about',
          title: 'The updated title',
          text: 'Updated about text',
        },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updatePage!.text).toBe('Updated about text')
      expect(result.data!.updatePage!.title).toBe('The updated title')
    }
  })

  graphqlTest('delete page', async (graphqlRequest) => {
    const admin = await login(graphqlRequest, 'admin@example.com')
    const { id } = await createPage(
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
        { id },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.deletePage).toBe(true)
    }
  })

  graphqlTest('extracts base64 images from HTML content', async (graphqlRequest) => {
    const admin = await login(graphqlRequest, 'admin@example.com')

    // Create a small base64 encoded 1x1 pixel PNG image
    const base64Image =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const htmlWithImage = `<p>Test content with image:</p><img src="data:image/png;base64,${base64Image}" alt="test image">`

    // Create page with embedded image
    const { id } = await createPage(
      graphqlRequest,
      {
        key: 'with-image',
        title: 'Page with image',
        text: htmlWithImage,
      },
      admin,
    )

    // Verify the image was extracted and stored
    const em = RequestContext.getEntityManager()
    if (!em) throw new Error('Entity manager not available')

    // Find the page and its document
    const page = await em.findOneOrFail(Page, { id })
    if (!page.content) throw new Error('Page content not found')

    // Find images associated with the document
    const images = await em.find(Image, { document: page.content })
    expect(images).toHaveLength(1)

    const image = images[0]
    expect(image.mimeType).toBe('image/png')
    expect(image.filename).toMatch(/^image_.*\.png$/)

    // Verify the image data was correctly stored
    const storedImageData = image.data.toString('base64')
    expect(storedImageData).toBe(base64Image)

    // Verify the HTML was updated to reference the stored image
    expect(page.content.html).toContain(`/api/images/${image.id}`)
    expect(page.content.html).not.toContain('data:image/png;base64')
  })

  graphqlTest('handles multiple images in HTML content', async (graphqlRequest) => {
    const admin = await login(graphqlRequest, 'admin@example.com')

    // Create two small base64 encoded images
    const base64Image1 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const base64Image2 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

    const htmlWithImages = `
      <p>First image:</p>
      <img src="data:image/png;base64,${base64Image1}" alt="first test image">
      <p>Second image:</p>
      <img src="data:image/png;base64,${base64Image2}" alt="second test image">
    `

    // Create page with embedded images
    const { id } = await createPage(
      graphqlRequest,
      {
        key: 'with-multiple-images',
        title: 'Page with multiple images',
        text: htmlWithImages,
      },
      admin,
    )

    // Verify the images were extracted and stored
    const em = RequestContext.getEntityManager()
    if (!em) throw new Error('Entity manager not available')

    // Find the page and its document
    const page = await em.findOneOrFail(Page, { id })
    if (!page.content) throw new Error('Page content not found')

    // Find images associated with the document
    const images = await em.find(Image, { document: page.content })
    expect(images).toHaveLength(2)

    // Verify the HTML was updated to reference image URLs (not necessarily the database IDs yet)
    expect(page.content.html).toMatch(/\/api\/images\/[\d_]+/)
    expect(page.content.html).not.toContain('data:image/png;base64')

    // Verify we have data-temp-id attributes which will be replaced with real IDs after flush
    expect(page.content.html).toMatch(/data-temp-id="[\d_]+"/)
  })

  graphqlTest(
    'returns HTML content from document when querying text field',
    async (graphqlRequest) => {
      const admin = await login(graphqlRequest, 'admin@example.com')

      // Create HTML content with distinctive formatting
      const htmlContent = '<p><strong>Formatted</strong> content with <em>styling</em></p>'

      // Create a page with this HTML content
      await createPage(
        graphqlRequest,
        {
          key: 'html-test',
          title: 'HTML Test',
          text: htmlContent,
        },
        admin,
      )

      // Query the page and verify text field returns the HTML content
      const result = await graphqlRequest(
        graphql(`
          query GetPageText($key: String!) {
            getPage(key: $key) {
              id
              title
              text
            }
          }
        `),
        { key: 'html-test' },
      )

      expect(result.errors).toBeUndefined()
      expect(result.data!.getPage!.text).toBe(htmlContent)

      // Also test that a page without a Document entity returns empty string
      const emptyResult = await graphqlRequest(
        graphql(`
          mutation CreateAndGetEmptyPage {
            createPage(key: "empty-test", title: "Empty Test", text: "") {
              id
              key
            }
          }
        `),
        {},
        admin,
      )

      expect(emptyResult.errors).toBeUndefined()

      const emptyPageQuery = await graphqlRequest(
        graphql(`
          query GetEmptyPageText($key: String!) {
            getPage(key: $key) {
              id
              text
            }
          }
        `),
        { key: 'empty-test' },
      )

      expect(emptyPageQuery.errors).toBeUndefined()
      expect(emptyPageQuery.data!.getPage!.text).toBe('')
    },
  )
})
