import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login, Session } from '../../test/server.js'
import sharp from 'sharp'

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

graphqlTest('the exhibit picture is served in display size', async (graphqlRequest, app) => {
  const session = await login('daffy@example.com')
  const id = await createExhibit(graphqlRequest, { title: 'Großes Bild' }, session)
  const photo = await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: '#ffcc00' },
  })
    .jpeg()
    .toBuffer()
  const boundary = 'grenze'
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    photo,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const upload = await app.inject({
    method: 'PUT',
    url: `/api/exhibit/${id}/image/main`,
    headers: {
      cookie: session.cookie,
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  })
  expect(upload.statusCode).toBe(200)

  const response = await app.inject({ method: 'GET', url: `/api/exhibit/${id}/image/main` })
  expect(response.statusCode).toBe(200)
  expect(response.headers['content-type']).toBe('image/jpeg')
  const { width, height } = await sharp(response.rawPayload).metadata()
  expect(width).toBe(1600)
  expect(height).toBe(1200)

  // The size is kept, so the second request is served without resizing again.
  const again = await app.inject({ method: 'GET', url: `/api/exhibit/${id}/image/main` })
  expect(again.rawPayload.equals(response.rawPayload)).toBe(true)
})

graphqlTest('a TIFF named .jpg gets a JPEG thumbnail', async (graphqlRequest, app) => {
  const session = await login('daffy@example.com')
  const id = await createExhibit(graphqlRequest, { title: 'Scan' }, session)
  const scan = await sharp({
    create: { width: 800, height: 600, channels: 3, background: '#3366cc' },
  })
    .tiff()
    .toBuffer()
  const boundary = 'grenze'
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="scan.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    scan,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const upload = await app.inject({
    method: 'PUT',
    url: `/api/exhibit/${id}/image/main`,
    headers: {
      cookie: session.cookie,
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  })
  expect(upload.statusCode).toBe(200)

  const thumbnail = await app.inject({
    method: 'GET',
    url: `/api/exhibit/${id}/image/thumbnail`,
  })
  expect(thumbnail.statusCode).toBe(200)
  expect(thumbnail.headers['content-type']).toBe('image/jpeg')
  expect((await sharp(thumbnail.rawPayload).metadata()).format).toBe('jpeg')
})

graphqlTest('a portrait phone photo gets an upright thumbnail', async (graphqlRequest, app) => {
  const session = await login('daffy@example.com')
  const id = await createExhibit(graphqlRequest, { title: 'Hochkant' }, session)
  // Stored landscape, left half red and right half blue, with the EXIF orientation a phone
  // writes for a picture taken upright: shown turned a quarter clockwise, red on top.
  const half = (background: string) =>
    sharp({ create: { width: 200, height: 300, channels: 3, background } })
      .png()
      .toBuffer()
  const photo = await sharp({
    create: { width: 400, height: 300, channels: 3, background: '#000000' },
  })
    .composite([
      { input: await half('#ff0000'), left: 0, top: 0 },
      { input: await half('#0000ff'), left: 200, top: 0 },
    ])
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
  const boundary = 'grenze'
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="IMG_0001.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    photo,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const upload = await app.inject({
    method: 'PUT',
    url: `/api/exhibit/${id}/image/main`,
    headers: {
      cookie: session.cookie,
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  })
  expect(upload.statusCode).toBe(200)

  const thumbnail = await app.inject({
    method: 'GET',
    url: `/api/exhibit/${id}/image/thumbnail`,
  })
  expect(thumbnail.statusCode).toBe(200)
  const { data, info } = await sharp(thumbnail.rawPayload)
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect([info.width, info.height]).toEqual([200, 200])
  const pixel = (x: number, y: number) => {
    const offset = (y * info.width + x) * info.channels
    return [data[offset], data[offset + 2]]
  }
  const [topRed, topBlue] = pixel(100, 10)
  const [bottomRed, bottomBlue] = pixel(100, 190)
  expect(topRed).toBeGreaterThan(200)
  expect(topBlue).toBeLessThan(50)
  expect(bottomRed).toBeLessThan(50)
  expect(bottomBlue).toBeGreaterThan(200)
})
