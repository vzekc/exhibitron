import { graphqlTest, login } from '../../test/server.js'
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

graphqlTest('should unassign exhibits when table is released', async (executeOperation) => {
  // Login as a user first
  const user = await login('daffy@example.com')

  // First, let's create an exhibit assigned to table 1
  const createResponse = await executeOperation(
    graphql(`
      mutation CreateExhibit($title: String!, $table: Int) {
        createExhibit(title: $title, table: $table) {
          id
          table {
            id
            number
          }
        }
      }
    `),
    {
      title: 'Test Exhibit',
      table: 1,
    },
    user,
  )

  expect(createResponse.errors).toBeUndefined()
  const exhibitId = createResponse.data!.createExhibit!.id

  // Take the table, so that releasing it is the holder's own doing
  const claimResponse = await executeOperation(
    graphql(`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
          id
        }
      }
    `),
    { number: 1 },
    user,
  )
  expect(claimResponse.errors).toBeUndefined()

  // Now release the table
  await executeOperation(
    graphql(`
      mutation ReleaseTable($number: Int!) {
        releaseTable(number: $number) {
          id
          number
          exhibitor {
            id
          }
        }
      }
    `),
    { number: 1 },
    user,
  )

  // Check if our specific exhibit is now unassigned
  const response = await executeOperation(
    graphql(`
      query GetExhibit($id: Int!) {
        getExhibit(id: $id) {
          id
          table {
            id
            number
          }
        }
      }
    `),
    { id: exhibitId },
  )

  expect(response.errors).toBeUndefined()
  expect(response.data?.getExhibit).not.toBeNull()
  const exhibit = response.data!.getExhibit!
  expect(exhibit.table).toBeNull()
})

graphqlTest('a table changing hands no longer shows visitor photos', async (executeOperation) => {
  const daffy = await login('daffy@example.com')
  const admin = await login('admin@example.com')

  const claim = await executeOperation(
    graphql(`
      mutation ClaimTable($number: Int!) {
        claimTable(number: $number) {
          id
        }
      }
    `),
    { number: 1 },
    daffy,
  )
  expect(claim.errors).toBeUndefined()

  const update = await executeOperation(
    graphql(`
      mutation UpdateTable($number: Int!, $showsVisitorPhotos: Boolean) {
        updateTable(number: $number, showsVisitorPhotos: $showsVisitorPhotos) {
          showsVisitorPhotos
        }
      }
    `),
    { number: 1, showsVisitorPhotos: true },
    daffy,
  )
  expect(update.errors).toBeUndefined()
  expect(update.data?.updateTable?.showsVisitorPhotos).toBe(true)

  const release = await executeOperation(
    graphql(`
      mutation ReleaseTable($number: Int!) {
        releaseTable(number: $number) {
          showsVisitorPhotos
        }
      }
    `),
    { number: 1 },
    admin,
  )
  expect(release.errors).toBeUndefined()
  expect(release.data?.releaseTable?.showsVisitorPhotos).toBe(false)
})
