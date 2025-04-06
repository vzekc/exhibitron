import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login, Session } from '../../test/server.js'
import { createRoom } from '../../test/utils.js'

const getCurrentExhibitor = async (graphqlRequest: ExecuteOperationFunction, session: Session) => {
  const result = await graphqlRequest(
    graphql(`
      query GetCurrentExhibitor {
        getCurrentExhibitor {
          id
        }
      }
    `),
    {},
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.getCurrentExhibitor!.id
}

const createPresentation = async (
  graphqlRequest: ExecuteOperationFunction,
  input: {
    title: string
    startTime?: string
    endTime?: string
    roomId?: number
    exhibitorIds?: number[]
    description?: string
  },
  session: Session,
) => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreatePresentation(
        $title: String!
        $startTime: DateTime
        $endTime: DateTime
        $roomId: Int
        $exhibitorIds: [Int!]
        $description: String
      ) {
        createPresentation(
          input: {
            title: $title
            startTime: $startTime
            endTime: $endTime
            roomId: $roomId
            exhibitorIds: $exhibitorIds
            description: $description
          }
        ) {
          id
        }
      }
    `),
    input,
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createPresentation!.id
}

describe('presentation', () => {
  graphqlTest('list all presentations', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetPresentations {
          getPresentations {
            id
            title
            startTime
            endTime
            room {
              id
              name
            }
            exhibitors {
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
    expect(result.data!.getPresentations).toBeDefined()
  })

  graphqlTest('try making updates without being logged in', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        mutation UpdatePresentation($id: Int!, $title: String) {
          updatePresentation(id: $id, input: { title: $title }) {
            id
          }
        }
      `),
      { id: 1, title: 'New Presentation Title' },
    )
    expect(result.errors![0].message).toBe('You do not have permission to update this presentation')
  })

  graphqlTest('presentation CRUD operations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')
    const otherUser = await login('donald@example.com')

    // Get exhibitors for users
    const exhibitor = await getCurrentExhibitor(graphqlRequest, user)
    const otherExhibitor = await getCurrentExhibitor(graphqlRequest, otherUser)

    // Create a room first
    const roomId = await createRoom(
      graphqlRequest,
      { name: 'Presentation Room', capacity: 100 },
      admin,
    )

    // Create a presentation
    const presentationId = await createPresentation(
      graphqlRequest,
      {
        title: 'Test Presentation',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        roomId,
        exhibitorIds: [1], // Assuming exhibitor with ID 1 exists
        description: '<p>Test presentation description</p>',
      },
      admin,
    )

    // Test updating presentation
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdatePresentation(
            $id: Int!
            $title: String
            $startTime: DateTime
            $endTime: DateTime
            $roomId: Int
            $exhibitorIds: [Int!]
            $description: String
          ) {
            updatePresentation(
              id: $id
              input: {
                title: $title
                startTime: $startTime
                endTime: $endTime
                roomId: $roomId
                exhibitorIds: $exhibitorIds
                description: $description
              }
            ) {
              id
              title
              startTime
              endTime
              room {
                id
                name
              }
              exhibitors {
                id
              }
              description
            }
          }
        `),
        {
          id: presentationId,
          title: 'Updated Presentation',
          startTime: '2024-01-01T14:00:00Z',
          endTime: '2024-01-01T15:00:00Z',
          roomId,
          exhibitorIds: [exhibitor, otherExhibitor],
          description: '<p>Updated presentation description</p>',
        },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updatePresentation!.title).toBe('Updated Presentation')
      expect(result.data!.updatePresentation!.exhibitors).toHaveLength(2)
      expect(result.data!.updatePresentation!.description).toBe(
        '<p>Updated presentation description</p>',
      )
    }

    // Test updating presentation as exhibitor
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdatePresentation($id: Int!, $title: String) {
            updatePresentation(id: $id, input: { title: $title }) {
              id
              title
            }
          }
        `),
        { id: presentationId, title: 'Exhibitor Updated Title' },
        user,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updatePresentation!.title).toBe('Exhibitor Updated Title')
    }

    // Test deleting presentation
    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeletePresentation($id: Int!) {
            deletePresentation(id: $id)
          }
        `),
        { id: presentationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.deletePresentation).toBe(true)
    }

    // Verify presentation is deleted
    {
      const result = await graphqlRequest(
        graphql(`
          query GetPresentation($id: Int!) {
            getPresentation(id: $id) {
              id
            }
          }
        `),
        { id: presentationId },
      )
      expect(result.errors![0].message).toMatch(/^Presentation not found/)
    }
  })
})
