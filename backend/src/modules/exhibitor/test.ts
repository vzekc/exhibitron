import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { graphqlTest, login } from '../../test/server.js'

describe('exhibitor', () => {
  graphqlTest(
    'deleteExhibitor removes the participation and its artifacts',
    async (graphqlRequest) => {
      const admin = await login('admin@example.com')
      const daffy = await login('daffy@example.com')

      // An approved registration for daffy, so the cancellation has one to remove
      const registerResult = await graphqlRequest(
        graphql(`
          mutation Register($input: RegisterInput!) {
            register(input: $input) {
              id
            }
          }
        `),
        {
          input: {
            name: 'Daffy Duck',
            email: 'daffy@example.com',
            nickname: 'daffy',
            topic: 'Ducks',
            data: {},
          },
        },
      )
      expect(registerResult.errors).toBeUndefined()
      const registrationId = registerResult.data!.register!.id

      {
        const result = await graphqlRequest(
          graphql(`
            mutation ApproveRegistration($id: Int!, $siteUrl: String!) {
              approveRegistration(id: $id, siteUrl: $siteUrl)
            }
          `),
          { id: registrationId, siteUrl: 'https://example.com/' },
          admin,
        )
        expect(result.errors).toBeUndefined()
      }

      {
        const result = await graphqlRequest(
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
        expect(result.errors).toBeUndefined()
      }

      const registrationResult = await graphqlRequest(
        graphql(`
          query GetRegistration($id: Int!) {
            getRegistration(id: $id) {
              exhibitorId
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(registrationResult.errors).toBeUndefined()
      const exhibitorId = registrationResult.data!.getRegistration!.exhibitorId!
      expect(exhibitorId).toBeDefined()

      const deleteExhibitorMutation = graphql(`
        mutation DeleteExhibitor($id: Int!) {
          deleteExhibitor(id: $id)
        }
      `)

      // Only administrators may cancel a participation
      {
        const result = await graphqlRequest(deleteExhibitorMutation, { id: exhibitorId }, daffy)
        expect(result.errors![0].message).toBe(
          'You must be an administrator to perform this operation',
        )
      }

      {
        const result = await graphqlRequest(deleteExhibitorMutation, { id: exhibitorId }, admin)
        expect(result.errors).toBeUndefined()
        expect(result.data!.deleteExhibitor).toBe(true)
      }

      // The exhibitor is gone
      {
        const result = await graphqlRequest(
          graphql(`
            query GetExhibitor($id: Int!) {
              getExhibitor(id: $id) {
                id
              }
            }
          `),
          { id: exhibitorId },
        )
        expect(result.errors).toBeDefined()
      }

      // Their exhibits are gone
      {
        const result = await graphqlRequest(
          graphql(`
            query GetExhibit($id: Int!) {
              getExhibit(id: $id) {
                id
              }
            }
          `),
          { id: 1001 },
        )
        expect(result.errors).toBeDefined()
      }

      // Their table is free again
      {
        const result = await graphqlRequest(
          graphql(`
            query GetTable($number: Int!) {
              getTable(number: $number) {
                exhibitor {
                  id
                }
              }
            }
          `),
          { number: 1 },
        )
        expect(result.errors).toBeUndefined()
        expect(result.data!.getTable!.exhibitor).toBeNull()
      }

      // The talks nobody else gives are gone
      {
        const result = await graphqlRequest(
          graphql(`
            query GetConferenceSessions {
              getConferenceSessions {
                title
              }
            }
          `),
          {},
        )
        expect(result.errors).toBeUndefined()
        expect(result.data!.getConferenceSessions).toEqual([])
      }

      // The registration is gone
      {
        const result = await graphqlRequest(
          graphql(`
            query GetRegistrations {
              getRegistrations {
                email
              }
            }
          `),
          {},
          admin,
        )
        expect(result.errors).toBeUndefined()
        expect(
          result.data!.getRegistrations!.find((r) => r!.email === 'daffy@example.com'),
        ).toBeUndefined()
      }

      // The account existed only for this participation, so it is gone too
      {
        const result = await graphqlRequest(
          graphql(`
            query GetUsers {
              getUsers {
                email
              }
            }
          `),
          {},
          admin,
        )
        expect(result.errors).toBeUndefined()
        expect(result.data!.getUsers!.find((u) => u!.email === 'daffy@example.com')).toBeUndefined()
      }
    },
  )

  graphqlTest('deleteExhibitor keeps an account that is still needed', async (graphqlRequest) => {
    const admin = await login('admin@example.com')

    // exadmin administers the exhibition; give them an exhibitor role to cancel
    const registerResult = await graphqlRequest(
      graphql(`
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            id
          }
        }
      `),
      {
        input: {
          name: 'Exhibition Admin',
          email: 'exadmin@example.com',
          nickname: 'exadmin',
          topic: 'Administration',
          data: {},
        },
      },
    )
    expect(registerResult.errors).toBeUndefined()
    const registrationId = registerResult.data!.register!.id

    {
      const result = await graphqlRequest(
        graphql(`
          mutation ApproveRegistration($id: Int!, $siteUrl: String!) {
            approveRegistration(id: $id, siteUrl: $siteUrl)
          }
        `),
        { id: registrationId, siteUrl: 'https://example.com/' },
        admin,
      )
      expect(result.errors).toBeUndefined()
    }

    const registrationResult = await graphqlRequest(
      graphql(`
        query GetRegistration($id: Int!) {
          getRegistration(id: $id) {
            exhibitorId
          }
        }
      `),
      { id: registrationId },
      admin,
    )
    const exhibitorId = registrationResult.data!.getRegistration!.exhibitorId!

    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteExhibitor($id: Int!) {
            deleteExhibitor(id: $id)
          }
        `),
        { id: exhibitorId },
        admin,
      )
      expect(result.errors).toBeUndefined()
    }

    // The participation is gone, the account stays
    {
      const result = await graphqlRequest(
        graphql(`
          query GetUsers {
            getUsers {
              email
            }
          }
        `),
        {},
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.getUsers!.find((u) => u!.email === 'exadmin@example.com')).toBeDefined()
    }
  })
})
