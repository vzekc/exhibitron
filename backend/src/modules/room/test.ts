import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { graphqlTest, login } from '../../test/server.js'
import { createRoom } from '../../test/utils.js'

describe('room', () => {
  graphqlTest('list all rooms', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetRooms {
          getRooms {
            id
            name
          }
        }
      `),
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getRooms).toBeDefined()
    expect(result.data!.getRooms?.length).toBeGreaterThan(0)
  })

  graphqlTest('try making updates without being logged in', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRoom($id: Int!, $name: String) {
          updateRoom(id: $id, input: { name: $name }) {
            id
          }
        }
      `),
      { id: 1, name: 'New Room Name' },
    )
    expect(result.errors![0].message).toBe('You must be an administrator to perform this operation')
  })

  graphqlTest('room CRUD operations', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const roomId = await createRoom(graphqlRequest, { name: 'Test Room' }, admin)

    // Test updating room
    {
      const result = await graphqlRequest(
        graphql(`
          mutation UpdateRoom($id: Int!, $name: String) {
            updateRoom(id: $id, input: { name: $name }) {
              id
              name
            }
          }
        `),
        { id: roomId, name: 'Updated Room' },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.updateRoom!.name).toBe('Updated Room')
    }

    // Test deleting room
    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteRoom($id: Int!) {
            deleteRoom(id: $id)
          }
        `),
        { id: roomId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.deleteRoom).toBe(true)
    }

    // Verify room is deleted
    {
      const result = await graphqlRequest(
        graphql(`
          query GetRoom($id: Int!) {
            getRoom(id: $id) {
              id
            }
          }
        `),
        { id: roomId },
      )
      expect(result.errors![0].message).toMatch(/^Room not found/)
    }
  })
})
