import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login } from '../../test/server.js'
import { RegisterInput } from '../../generated/graphql.js'
import { initORM } from '../../db.js'
import { makeNewRegistrationEmail } from './emails.js'

describe('registration', () => {
  const registrationDefaults = {
    name: 'John Doe',
    email: 'john@doe.com',
    nickname: 'johnny',
    topic: 'ZX Spectrum',
    message: 'Hello!',
    data: { key: 'value' },
  }
  let emailCount = 0
  const createRegistration = async (
    graphqlRequest: ExecuteOperationFunction,
    input: Partial<RegisterInput> = {},
  ) => {
    const email = registrationDefaults.email.replace('@', `+${emailCount++}@`)
    const result = await graphqlRequest(
      graphql(`
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            id
          }
        }
      `),
      { input: { ...registrationDefaults, email, ...input } },
    )
    expect(result.errors).toBeUndefined()
    return result.data!.register!.id
  }

  graphqlTest('create', async (graphqlRequest) => {
    const result = await createRegistration(graphqlRequest)
    expect(result).toBeDefined()
  })

  graphqlTest('new-registration email JSON attachment shape', async (graphqlRequest) => {
    const registrationId = await createRegistration(graphqlRequest)

    const { registration: registrationRepo } = await initORM()
    const registration = await registrationRepo.findOneOrFail(
      { id: registrationId },
      { populate: ['exhibition'] },
    )

    const email = makeNewRegistrationEmail(
      ['admin@example.com'],
      registration,
      'https://example.com/',
    )

    expect(email.attachments).toHaveLength(1)
    const attachment = email.attachments[0]
    expect(attachment.filename).toBe(
      `registration-${registration.exhibition.key}-${registrationId}.json`,
    )

    const json = JSON.parse(attachment.content)

    // The attachment must carry the registration record and nothing more.
    expect(Object.keys(json).sort()).toEqual([
      'createdAt',
      'data',
      'email',
      'exhibition',
      'id',
      'message',
      'name',
      'nickname',
      'notes',
      'status',
      'topic',
      'updatedAt',
    ])

    expect(json.id).toBe(registrationId)
    expect(json.name).toBe('John Doe')
    expect(json.email).toBe(registration.email)
    expect(json.topic).toBe('ZX Spectrum')
    expect(json.nickname).toBe('johnny')
    expect(json.message).toBe('Hello!')
    expect(json.status).toBe('new')
    expect(json.data).toEqual({ key: 'value' })
    expect(typeof json.createdAt).toBe('string')

    // The embedded exhibition is trimmed to identifiers — no seatplanSvg bloat.
    expect(Object.keys(json.exhibition).sort()).toEqual(['key', 'title'])
    expect(attachment.content).not.toContain('seatplanSvg')
  })

  graphqlTest('create duplicate', async (graphqlRequest) => {
    await createRegistration(graphqlRequest, { email: 'blub@bla.com' })
    const result = await graphqlRequest(
      graphql(`
        mutation CreateRegistration($input: RegisterInput!) {
          register(input: $input) {
            id
          }
        }
      `),
      { input: { ...registrationDefaults, email: 'blub@bla.com' } },
    )
    expect(result.errors![0].message).toBe('The email address is already registered')
  })

  graphqlTest('retrieve all', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const result = await graphqlRequest(
      graphql(`
        query GetRegistrations {
          getRegistrations {
            id
          }
        }
      `),
      {},
      admin,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getRegistrations).not.toBeNull()
    expect(result.data!.getRegistrations!.length).toBeGreaterThan(0)
  })

  graphqlTest('retrieve all without admin rights', async (graphqlRequest) => {
    const user = await login('donald@example.com')
    const result = await graphqlRequest(
      graphql(`
        query GetRegistrations {
          getRegistrations {
            id
          }
        }
      `),
      {},
      user,
    )
    expect(result.errors![0].message).toBe('You must be an administrator to perform this operation')
  })

  graphqlTest('update', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const registrationId = await createRegistration(graphqlRequest)

    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistrationNotes($id: Int!, $notes: String!) {
          updateRegistrationNotes(id: $id, notes: $notes) {
            notes
          }
        }
      `),
      {
        id: registrationId,
        notes: 'Updated notes',
      },
      admin,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.updateRegistrationNotes!.notes).toBe('Updated notes')
  })

  graphqlTest('update without admin rights', async (graphqlRequest) => {
    const user = await login('donald@example.com')
    const registrationId = await createRegistration(graphqlRequest)

    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistrationNotes($id: Int!, $notes: String!) {
          updateRegistrationNotes(id: $id, notes: $notes) {
            notes
          }
        }
      `),
      {
        id: registrationId,
        notes: 'Updated notes',
      },
      user,
    )
    expect(result.errors![0].message).toBe('You must be an administrator to perform this operation')
  })

  graphqlTest('update nonexistent', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const result = await graphqlRequest(
      graphql(`
        mutation UpdateRegistrationNotes($id: Int!, $notes: String!) {
          updateRegistrationNotes(id: $id, notes: $notes) {
            notes
          }
        }
      `),
      { id: 9999, notes: 'Updated notes' },
      admin,
    )
    expect(result.errors![0].message).toBe('Registration not found ({ id: 9999 })')
  })

  graphqlTest('approve registration with existing nickname reuses user', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const registrationId = await createRegistration(graphqlRequest, {
      name: 'Daffy Duck',
      nickname: 'daffy',
      email: 'newdaffy@example.com',
    })

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

    const userCheck = await graphqlRequest(
      graphql(`
        query GetUsers {
          getUsers {
            id
            email
            nickname
          }
        }
      `),
      {},
      admin,
    )
    expect(userCheck.errors).toBeUndefined()
    const daffy = userCheck.data!.getUsers!.find((u) => u!.nickname === 'daffy')
    expect(daffy).toBeDefined()
    expect(daffy!.email).toBe('newdaffy@example.com')
    expect(daffy!.id).toBe(1002)
    const oldDaffy = userCheck.data!.getUsers!.find((u) => u!.email === 'daffy@example.com')
    expect(oldDaffy).toBeUndefined()
  })

  graphqlTest('approve, reject and delete registration', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const registrationId = await createRegistration(graphqlRequest)

    {
      const result = await graphqlRequest(
        graphql(`
          mutation SetRegistrationInProgress($id: Int!) {
            setRegistrationInProgress(id: $id)
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
    }

    {
      const result = await graphqlRequest(
        graphql(`
          query GetRegistration($id: Int!) {
            getRegistration(id: $id) {
              status
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.getRegistration!.status).toBe('inProgress')
    }

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
          query GetRegistration($id: Int!) {
            getRegistration(id: $id) {
              status
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.getRegistration!.status).toBe('approved')
    }

    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteRegistration($id: Int!) {
            deleteRegistration(id: $id)
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors![0].message).toBe('Cannot delete approved registration')
    }

    {
      const result = await graphqlRequest(
        graphql(`
          mutation RejectRegistration($id: Int!) {
            rejectRegistration(id: $id)
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
    }

    {
      const result = await graphqlRequest(
        graphql(`
          mutation DeleteRegistration($id: Int!) {
            deleteRegistration(id: $id)
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors).toBeUndefined()
    }

    {
      const result = await graphqlRequest(
        graphql(`
          query GetRegistration($id: Int!) {
            getRegistration(id: $id) {
              id
            }
          }
        `),
        { id: registrationId },
        admin,
      )
      expect(result.errors![0].message).toMatch(/^Registration not found/)
    }
  })
})
