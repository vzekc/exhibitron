import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest } from '../../test/apollo.js'

describe('registration', () => {
  const createRegistration = async (
    graphqlRequest: ExecuteOperationFunction,
    payload: Record<string, unknown>,
  ) => {
    const result = await graphqlRequest(
      graphql(`
        mutation CreateRegistration($input: CreateRegistrationInput!) {
          createRegistration(input: $input) {
            id
          }
        }
      `),
      { input: payload },
    )
    expect(result.errors).toBeUndefined()
    return result.data!.createRegistration.id
  }

  graphqlTest('create', async (graphqlRequest) => {
    const payload = {
      name: 'John Doe',
      email: 'john@doe.com',
      nickname: 'johnny',
      topic: 'ZX Spectrum',
      message: 'Hello!',
      data: { key: 'value' },
    }
    const result = await createRegistration(graphqlRequest, payload)
    expect(result).toBeDefined()
  })

  graphqlTest('create duplicate', async (graphqlRequest) => {
    const payload = {
      name: 'John Doe',
      email: 'john@doe.com',
      nickname: 'johnny',
      topic: 'ZX Spectrum',
      message: 'Hello!',
      data: { key: 'value' },
    }
    await createRegistration(graphqlRequest, payload)
    const result = await graphqlRequest(
      graphql(`
        mutation CreateRegistration($input: CreateRegistrationInput!) {
          createRegistration(input: $input)
        }
      `),
      { input: payload },
    )
    expect(result.errors![0].message).toBe(
      'The email address is already registered',
    )
  })

  graphqlTest('retrieve all', async (graphqlRequest) => {
    const admin = await login(app, 'admin@example.com')
    const result = await graphqlRequest(
      graphql(`
        query GetRegistrations {
          getRegistrations {
            items {
              id
            }
            total
          }
        }
      `),
      {},
      admin,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getRegistrations.items).toBeInstanceOf(Array)
    expect(result.data!.getRegistrations.total).toBeGreaterThan(0)
  })

  graphqlTest('retrieve all without admin rights', async (graphqlRequest) => {
    const user = await login(app, 'donald@example.com')
    const result = await graphqlRequest(
      graphql(`
        query GetRegistrations {
          getRegistrations {
            items {
              id
            }
            total
          }
        }
      `),
      {},
      user,
    )
    expect(result.errors![0].message).toBe(
      'Must be logged as administrator to retrieve registrations',
    )
  })

  graphqlTest('update', async (graphqlRequest) => {
    const admin = await login(app, 'admin@example.com')
    const payload = {
      name: 'John Doe',
      email: 'john@doe.com',
      nickname: 'johnny',
      topic: 'ZX Spectrum',
      message: 'Hello!',
      data: { key: 'value' },
    }
    const registrationId = await createRegistration(graphqlRequest, payload)

    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistration(
          $id: ID!
          $input: UpdateRegistrationInput!
        ) {
          updateRegistration(id: $id, input: $input) {
            name
            message
          }
        }
      `),
      {
        id: registrationId,
        input: { name: 'Jane Doe', message: 'Updated message' },
      },
      admin,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.updateRegistration.name).toBe('Jane Doe')
    expect(result.data!.updateRegistration.message).toBe('Updated message')
  })

  graphqlTest('deny update of status field', async (graphqlRequest) => {
    const admin = await login(app, 'admin@example.com')
    const payload = {
      name: 'John Doe',
      email: 'john@doe.com',
      nickname: 'johnny',
      topic: 'ZX Spectrum',
      message: 'Hello!',
      data: { key: 'value' },
    }
    const registrationId = await createRegistration(graphqlRequest, payload)

    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistration(
          $id: ID!
          $input: UpdateRegistrationInput!
        ) {
          updateRegistration(id: $id, input: $input)
        }
      `),
      { id: registrationId, input: { status: 'approved' } },
      admin,
    )
    expect(result.errors![0].message).toBe(
      'Field "status" is not defined by type "UpdateRegistrationInput"',
    )
  })

  graphqlTest('update without admin rights', async (graphqlRequest) => {
    const user = await login(app, 'donald@example.com')
    const payload = {
      name: 'John Doe',
      email: 'john@doe.com',
      nickname: 'johnny',
      topic: 'ZX Spectrum',
      message: 'Hello!',
      data: { key: 'value' },
    }
    const registrationId = await createRegistration(graphqlRequest, payload)

    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistration(
          $id: ID!
          $input: UpdateRegistrationInput!
        ) {
          updateRegistration(id: $id, input: $input)
        }
      `),
      {
        id: registrationId,
        input: { name: 'Jane Doe', message: 'Updated message' },
      },
      user,
    )
    expect(result.errors![0].message).toBe(
      'Must be logged as administrator to update registrations',
    )
  })

  graphqlTest('update nonexistent', async (graphqlRequest) => {
    const admin = await login(app, 'admin@example.com')
    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistration(
          $id: ID!
          $input: UpdateRegistrationInput!
        ) {
          updateRegistration(id: $id, input: $input)
        }
      `),
      { id: '9999', input: { name: 'Jane Doe', message: 'Updated message' } },
      admin,
    )
    expect(result.errors![0].message).toBe(
      'Registration not found ({ id: 9999 })',
    )
  })

  graphqlTest(
    'approve, reject and delete registration',
    async (graphqlRequest) => {
      const admin = await login(app, 'admin@example.com')
      const payload = {
        name: 'Hinz Kunz',
        email: 'hinz@kunz.com',
        nickname: 'hinz',
        topic: 'ZX Spectrum',
        message: 'Hello!',
        data: { key: 'value' },
      }
      const registrationId = await createRegistration(graphqlRequest, payload)

      let result = await graphqlRequest(
        graphql(`
          mutation SetRegistrationStatus(
            $id: ID!
            $status: RegistrationStatus!
          ) {
            setRegistrationStatus(id: $id, status: $status)
          }
        `),
        { id: registrationId, status: 'inProgress' },
        admin,
      )
      expect(result.errors).toBeUndefined()

      result = await graphqlRequest(
        graphql(`
          query GetRegistration($id: ID!) {
            getRegistration(id: $id) {
              status
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.getRegistration.status).toBe('inProgress')

      result = await graphqlRequest(
        graphql(`
          mutation SetRegistrationStatus(
            $id: ID!
            $status: RegistrationStatus!
          ) {
            setRegistrationStatus(id: $id, status: $status)
          }
        `),
        { id: registrationId, status: 'approved' },
        admin,
      )
      expect(result.errors).toBeUndefined()

      result = await graphqlRequest(
        graphql(`
          query GetRegistration($id: ID!) {
            getRegistration(id: $id) {
              status
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.getRegistration.status).toBe('approved')

      result = await graphqlRequest(
        graphql(`
          mutation DeleteRegistration($id: ID!) {
            deleteRegistration(id: $id)
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors![0].message).toBe(
        'Cannot delete approved registration',
      )

      result = await graphqlRequest(
        graphql(`
          mutation SetRegistrationStatus(
            $id: ID!
            $status: RegistrationStatus!
          ) {
            setRegistrationStatus(id: $id, status: $status)
          }
        `),
        { id: registrationId, status: 'rejected' },
        admin,
      )
      expect(result.errors).toBeUndefined()

      result = await graphqlRequest(
        graphql(`
          mutation DeleteRegistration($id: ID!) {
            deleteRegistration(id: $id)
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()

      result = await graphqlRequest(
        graphql(`
          query GetRegistration($id: ID!) {
            getRegistration(id: $id) {
              id
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors![0].message).toBe('Registration not found')
    },
  )
})
