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

const createConferenceSession = async (
  graphqlRequest: ExecuteOperationFunction,
  input: {
    title: string
    startTime?: string
    durationMinutes?: number
    roomId?: number
    exhibitorIds?: number[]
    description?: string
  },
  session: Session,
) => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateConferenceSession(
        $title: String!
        $startTime: DateTime
        $durationMinutes: Int
        $roomId: Int
        $exhibitorIds: [Int!]
        $description: String
      ) {
        createConferenceSession(
          input: {
            title: $title
            startTime: $startTime
            durationMinutes: $durationMinutes
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
  return result.data!.createConferenceSession!.id
}

describe('conferenceSession', () => {
  graphqlTest('list all conferenceSessions', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetConferenceSessions {
          getConferenceSessions {
            id
            title
            startTime
            endTime
            durationMinutes
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
    expect(result.data!.getConferenceSessions).toBeDefined()
  })

  graphqlTest('try making updates without being logged in', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        mutation UpdateConferenceSession($id: Int!, $title: String) {
          updateConferenceSession(id: $id, input: { title: $title }) {
            id
          }
        }
      `),
      { id: 1, title: 'New ConferenceSession Title' },
    )
    expect(result.errors![0].message).toBe(
      'You do not have permission to update this conferenceSession',
    )
  })

  graphqlTest('conferenceSession CRUD operations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')
    const otherUser = await login('donald@example.com')

    // Get exhibitors for users
    const exhibitor = await getCurrentExhibitor(graphqlRequest, user)
    const otherExhibitor = await getCurrentExhibitor(graphqlRequest, otherUser)

    // Create a room first
    const roomId = await createRoom(graphqlRequest, { name: 'ConferenceSession Room' }, admin)

    // Create a conferenceSession
    const conferenceSessionId = await createConferenceSession(
      graphqlRequest,
      {
        title: 'Test ConferenceSession',
        startTime: '2024-01-01T10:00:00Z',
        durationMinutes: 60,
        roomId,
        exhibitorIds: [1], // Assuming exhibitor with ID 1 exists
        description: '<p>Test conferenceSession description</p>',
      },
      admin,
    )

    // Test updating conferenceSession
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateConferenceSession(
            $id: Int!
            $title: String
            $startTime: DateTime
            $durationMinutes: Int
            $roomId: Int
            $exhibitorIds: [Int!]
            $description: String
          ) {
            updateConferenceSession(
              id: $id
              input: {
                title: $title
                startTime: $startTime
                durationMinutes: $durationMinutes
                roomId: $roomId
                exhibitorIds: $exhibitorIds
                description: $description
              }
            ) {
              id
              title
              startTime
              endTime
              durationMinutes
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
          id: conferenceSessionId,
          title: 'Updated ConferenceSession',
          startTime: '2024-01-01T14:00:00Z',
          durationMinutes: 60,
          roomId,
          exhibitorIds: [exhibitor, otherExhibitor],
          description: '<p>Updated conferenceSession description</p>',
        },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateConferenceSession!.title).toBe('Updated ConferenceSession')
      expect(result.data!.updateConferenceSession!.exhibitors).toHaveLength(2)
      expect(result.data!.updateConferenceSession!.description).toBe(
        '<p>Updated conferenceSession description</p>',
      )
    }

    // Test updating conferenceSession as exhibitor
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateConferenceSession($id: Int!, $title: String) {
            updateConferenceSession(id: $id, input: { title: $title }) {
              id
              title
            }
          }
        `),
        { id: conferenceSessionId, title: 'Exhibitor Updated Title' },
        user,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateConferenceSession!.title).toBe('Exhibitor Updated Title')
    }

    // Test deleting conferenceSession
    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteConferenceSession($id: Int!) {
            deleteConferenceSession(id: $id)
          }
        `),
        { id: conferenceSessionId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.deleteConferenceSession).toBe(true)
    }

    // Verify conferenceSession is deleted
    {
      const result = await graphqlRequest(
        graphql(`
          query GetConferenceSession($id: Int!) {
            getConferenceSession(id: $id) {
              id
            }
          }
        `),
        { id: conferenceSessionId },
      )
      expect(result.errors![0].message).toMatch(/^ConferenceSession not found/)
    }
  })
})
