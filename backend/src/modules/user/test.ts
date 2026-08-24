import { expect, MockedFunction, vi, beforeAll } from 'vitest'
import { graphql } from 'gql.tada'
import { graphqlTest, login } from '../../test/server.js'
import { sendEmail } from '../common/sendEmail.js'
import { initORM } from '../../db.js'
import { User } from './entity.js'
import { VolunteerActivity, VolunteerBooking, VolunteerPeriod } from '../volunteer/entity.js'

let mockedSendEmail: MockedFunction<typeof sendEmail>

beforeAll(async () => {
  mockedSendEmail = vi.spyOn(await import('../common/sendEmail.js'), 'sendEmail') as MockedFunction<
    typeof sendEmail
  >
  mockedSendEmail.mockImplementation(async () => {})
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

  const session = await login('meistereder@example.com', 'password123')

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
  const session = await login('meistereder@example.com', 'password123')

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
    expect(result.errors![0].message).toBe('You must be an administrator to perform this operation')
  }

  const admin = await login('admin@example.com')

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
      admin,
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
  const admin = await login('admin@example.com')
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

  const donald = await login('donald@example.com')
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
  const admin = await login('admin@example.com')
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
      admin,
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
    ;[, token] = emailArgs.body?.html.match(/resetPassword\?token=([a-z0-9]+)/) ?? []
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

  const donald = await login('donald@example.com', 'newpassword')
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

/*
 * A returning exhibitor who registers again under a new address ends up with a
 * second account, and linking the forum name folds it into the one that
 * already carries the name. The address moves across, and so does everything
 * the second account collected on the way.
 */
graphqlTest(
  'forum link merges a re-registered exhibitor into the account holding the name',
  async () => {
    const db = await initORM()
    const exhibition = await db.exhibition.findOneOrFail({ key: 'cc2025' })

    const canonical = db.user.create({
      email: 'ruecker-alt@example.com',
      fullName: 'Rita Rücker',
      nickname: 'ruecker',
      isAdministrator: false,
    })
    const duplicate = db.user.create({
      email: 'ruecker-neu@example.com',
      fullName: 'Rita Rücker',
      isAdministrator: false,
    })
    duplicate.emailVerifiedAt = new Date()
    db.em.persist([canonical, duplicate])
    await db.em.flush()

    const exhibitor = db.exhibitor.create({ exhibition, user: duplicate })
    db.em.persist(exhibitor)
    db.user.createPasswordResetToken(duplicate, Date.now() + 3600000)
    await db.em.flush()
    await db.em.populate(duplicate, ['passwordResetToken'])
    const token = duplicate.passwordResetToken!
    const duplicateId = duplicate.id

    /* The forum spells the name differently than the account does. */
    const merged = await db.user.associateForumUser({
      nickname: 'Ruecker',
      registrationToken: token,
      isAdministrator: false,
    })

    expect(merged).not.toBe('needsSetup')
    expect((merged as User).id).toBe(canonical.id)
    expect((merged as User).email).toBe('ruecker-neu@example.com')
    expect((merged as User).emailVerifiedAt).toBeDefined()
    expect(await db.user.findOne({ id: duplicateId })).toBeNull()

    await db.em.refresh(exhibitor)
    expect(exhibitor.user.id).toBe(canonical.id)
  },
)

/*
 * The shifts a volunteer booked under the second account are theirs, and the
 * merge carries them over rather than letting them go with the row.
 */
graphqlTest('the merge keeps the volunteer shifts of the account it folds in', async () => {
  const db = await initORM()
  const exhibition = await db.exhibition.findOneOrFail({ key: 'cc2025' })

  const canonical = db.user.create({
    email: 'sommer-alt@example.com',
    fullName: 'Sven Sommer',
    nickname: 'sommer',
    isAdministrator: false,
  })
  const duplicate = db.user.create({
    email: 'sommer-neu@example.com',
    fullName: 'Sven Sommer',
    isAdministrator: false,
  })
  db.em.persist([canonical, duplicate])
  await db.em.flush()

  const activity = db.em.create(VolunteerActivity, {
    exhibition,
    key: 'merge-test',
    name: 'Aufbau',
    summary: 'Tische tragen',
  })
  const period = db.em.create(VolunteerPeriod, {
    activity,
    startTime: new Date('2026-09-01T09:00:00Z'),
    durationMinutes: 180,
  })
  const booking = db.em.create(VolunteerBooking, {
    period,
    user: duplicate,
    startTime: new Date('2026-09-01T09:00:00Z'),
    durationMinutes: 60,
  })
  db.em.persist([activity, period, booking])
  db.user.createPasswordResetToken(duplicate, Date.now() + 3600000)
  await db.em.flush()
  await db.em.populate(duplicate, ['passwordResetToken'])
  const token = duplicate.passwordResetToken!
  const bookingId = booking.id

  await db.user.associateForumUser({
    nickname: 'sommer',
    registrationToken: token,
    isAdministrator: false,
  })

  const kept = await db.em.findOne(VolunteerBooking, { id: bookingId }, { populate: ['user'] })
  expect(kept).not.toBeNull()
  expect(kept!.user.id).toBe(canonical.id)
})

/*
 * With no second account in the way the name simply goes onto the account the
 * token belongs to, and the token is spent.
 */
graphqlTest('forum link without a name conflict associates and spends the token', async () => {
  const db = await initORM()

  const user = db.user.create({
    email: 'tauber@example.com',
    fullName: 'Tina Tauber',
    isAdministrator: false,
  })
  db.em.persist(user)
  db.user.createPasswordResetToken(user, Date.now() + 3600000)
  await db.em.flush()
  await db.em.populate(user, ['passwordResetToken'])
  const token = user.passwordResetToken!

  const result = await db.user.associateForumUser({
    nickname: 'tauber',
    registrationToken: token,
    isAdministrator: false,
  })

  expect((result as User).id).toBe(user.id)
  expect((result as User).nickname).toBe('tauber')
  expect(await db.user.findOne({ passwordResetToken: token })).toBeNull()
})
