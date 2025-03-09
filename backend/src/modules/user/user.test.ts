import { expect, MockedFunction, vi, beforeAll } from 'vitest'
import { graphql } from 'gql.tada'
import {
  ExecuteOperationFunction,
  graphqlTest,
  login,
} from '../../test/apollo.js'
import { sendEmail } from '../common/sendEmail.js'

vi.mock('../common/sendEmail')
let mockedSendEmail: MockedFunction<typeof sendEmail>

beforeAll(async () => {
  mockedSendEmail = sendEmail as MockedFunction<typeof sendEmail>
})

graphqlTest('login', async (graphqlRequest) => {
  {
    const result = await graphqlRequest(
      graphql(`
        query GetCurrentUser {
          getCurrentUser {
            id
          }
        }
      `),
    )
    expect(result.data?.getCurrentUser).toBeNull()
  }

  const session = await login(
    graphqlRequest,
    'meistereder@example.com',
    'password123',
  )

  {
    const result = await graphqlRequest(
      graphql(`
        query GetCurrentUser {
          getCurrentUser {
            id
            email
          }
        }
      `),
      {},
      session,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getCurrentUser).toMatchObject({
      email: 'meistereder@example.com',
    })
  }
})

graphqlTest('update', async (graphqlRequest) => {
  const session = await login(
    graphqlRequest,
    'meistereder@example.com',
    'password123',
  )

  {
    const result = await graphqlRequest(
      graphql(`
        mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
          updateUserProfile(input: $input) {
            bio
          }
        }
      `),
      { input: { bio: 'I was born with a plastic spoon in my mouth' } },
      session,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.updateUserProfile).toMatchObject({
      bio: 'I was born with a plastic spoon in my mouth',
    })
  }
})

graphqlTest('lookups', async (graphqlRequest) => {
  {
    const result = await graphqlRequest(
      graphql(`
        query GetUserById($id: Int!) {
          getUser(id: $id) {
            id
            email
            fullName
          }
        }
      `),
      { id: 1002 },
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getUser).toMatchObject({
      email: 'daffy@example.com',
      fullName: 'Daffy Duck',
    })
  }

  {
    const result = await graphqlRequest(
      graphql(`
        query GetUserByEmail($email: String!) {
          getUserByEmail(email: $email) {
            id
            email
            fullName
          }
        }
      `),
      { email: 'meistereder@example.com' },
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getUserByEmail).toMatchObject({
      email: 'meistereder@example.com',
      fullName: 'Harald Eder',
    })
  }
})

graphqlTest('profile', async (graphqlRequest) => {
  const admin = await login(graphqlRequest, 'admin@example.com')
  {
    const result = await graphqlRequest(
      graphql(`
        query GetCurrentUser {
          getCurrentUser {
            isAdministrator
          }
        }
      `),
      {},
      admin,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getCurrentUser).toMatchObject({
      isAdministrator: true,
    })
  }

  const donald = await login(graphqlRequest, 'donald@example.com')
  {
    const result = await graphqlRequest(
      graphql(`
        query GetCurrentUser {
          getCurrentUser {
            isAdministrator
          }
        }
      `),
      {},
      donald,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getCurrentUser).toMatchObject({
      isAdministrator: false,
    })
  }
})

graphqlTest('user list', async (graphqlRequest) => {
  const admin = await login(graphqlRequest, 'admin@example.com')
  {
    const result = await graphqlRequest(
      graphql(`
        query GetUsers {
          getUsers {
            id
            email
          }
        }
      `),
      {},
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getUsers).toBeInstanceOf(Array)
  }
})

graphqlTest('password reset', async (graphqlRequest) => {
  let token
  {
    const result = await graphqlRequest(
      graphql(`
        mutation RequestPasswordReset($email: String!, $resetUrl: String!) {
          requestPasswordReset(email: $email, resetUrl: $resetUrl)
        }
      `),
      { email: 'donald@example.com', resetUrl: '/resetPassword?token=' },
    )
    expect(result.errors).toBeUndefined()
    expect(mockedSendEmail).toHaveBeenCalledTimes(1)
    const emailArgs = mockedSendEmail.mock.calls[0][0]
    expect(emailArgs.to).toStrictEqual(['donald@example.com'])
    expect(emailArgs.body?.html).toMatch(/resetPassword\?token=[a-z0-9]+/)
    ;[, token] =
      emailArgs.body?.html.match(/resetPassword\?token=([a-z0-9]+)/) ?? []
  }

  {
    const result = await graphqlRequest(
      graphql(`
        mutation ResetPassword($token: String!, $password: String!) {
          resetPassword(token: $token, password: $password)
        }
      `),
      { token, password: 'newpassword' },
    )
    expect(result.errors).toBeUndefined()
  }

  const donald = await login(
    graphqlRequest,
    'donald@example.com',
    'newpassword',
  )
  {
    const result = await graphqlRequest(
      graphql(`
        query GetCurrentUser {
          getCurrentUser {
            id
          }
        }
      `),
      {},
      donald,
    )
    expect(result.errors).toBeUndefined()
    expect(result.data?.getCurrentUser?.id).toBe(donald.userId)
  }
})
