import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, expect, MockedFunction, vi, test } from 'vitest'
import { deleteDatabase, initTestApp, login } from '../../test/utils.js'
import { sendEmail } from '../common/sendEmail.js'

vi.mock('../common/sendEmail')
let mockedSendEmail: MockedFunction<typeof sendEmail>

let app: FastifyInstance
let dbName: string

beforeAll(async () => {
  ;({ app, dbName } = await initTestApp())
  mockedSendEmail = sendEmail as MockedFunction<typeof sendEmail>
})

afterAll(async () => {
  // we close only the fastify app - it will close the database connection via onClose hook automatically
  await app.close()
  deleteDatabase(dbName)
})

test('login', async () => {
  let res = await app.inject({
    method: 'get',
    url: '/api/user/profile',
  })
  expect(res).toHaveStatus(401)

  res = await app.inject({
    method: 'get',
    url: '/api/user/current',
  })
  expect(res).toHaveStatus(204)

  res = await app.inject({
    method: 'post',
    url: '/api/user/login',
    payload: {
      email: 'meistereder@example.com',
      password: 'password123',
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toStrictEqual({
    nickname: 'MeisterEder',
    fullName: 'Harald Eder',
    email: 'meistereder@example.com',
    token: expect.stringMatching(/.*/),
    bio: '',
    contacts: {},
    id: 1001,
    isAdministrator: false,
  })

  expect(res.body).not.toContain('password')
  res = await app.inject({
    method: 'post',
    url: '/api/user/login',
    payload: {
      email: 'meistereder@example.com',
      password: 'password456',
    },
  })
  expect(res).toHaveStatus(401)
  expect(res.json()).toMatchObject({
    error: 'Invalid combination of email address and password',
  })
})

test('update', async () => {
  let res = await app.inject({
    method: 'post',
    url: '/api/user/login',
    payload: {
      email: 'meistereder@example.com',
      password: 'password123',
    },
  })
  expect(res).toHaveStatus(200)
  const user = res.json()
  expect(user).toMatchObject({
    fullName: 'Harald Eder',
  })

  res = await app.inject({
    method: 'get',
    url: '/api/user/current',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({ nickname: 'MeisterEder' })

  res = await app.inject({
    method: 'patch',
    url: '/api/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      bio: 'I was born with a plastic spoon in my mouth',
    },
  })
  expect(res).toHaveStatus(200)

  res = await app.inject({
    method: 'get',
    url: '/api/user/current',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    bio: 'I was born with a plastic spoon in my mouth',
  })

  res = await app.inject({
    method: 'patch',
    url: '/api/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      isAdministrator: true,
    },
  })
  expect(res).toHaveStatus(400)
  // fixme: should really look at the validation error
  //expect(res.body).toMatch(/additionalProperty.*isAdministrator/)
})

test('lookups', async () => {
  let res = await app.inject({
    method: 'get',
    url: '/api/user/1002',
  })
  expect(res).toHaveStatus(200)
  expect(res).not.toContain('password')
  expect(res.json()).toStrictEqual({
    nickname: 'daffy',
    email: 'daffy@example.com',
    fullName: 'Daffy Duck',
    id: 1002,
    isAdministrator: false,
    bio: expect.anything(),
    contacts: {},
  })
  res = await app.inject({
    method: 'get',
    url: '/api/user/meistereder@example.com',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toStrictEqual({
    nickname: 'MeisterEder',
    email: 'meistereder@example.com',
    fullName: 'Harald Eder',
    id: 1001,
    isAdministrator: false,
    bio: expect.anything(),
    contacts: {},
  })
})

test('profile', async () => {
  // check that admin has the isAdministrator flag
  const admin = await login(app, 'admin@example.com')
  let res = await app.inject({
    method: 'get',
    url: '/api/user/current',
    headers: {
      Authorization: `Bearer ${admin.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    isAdministrator: true,
  })

  // check that donald does not have isAdministrator set
  const donald = await login(app, 'donald@example.com')
  res = await app.inject({
    method: 'get',
    url: '/api/user/current',
    headers: {
      Authorization: `Bearer ${donald.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    isAdministrator: false,
  })
})

test('user list', async () => {
  let res = await app.inject({
    method: 'get',
    url: '/api/user',
  })
  expect(res).toHaveStatus(403)

  const admin = await login(app, 'admin@example.com')
  res = await app.inject({
    method: 'get',
    url: '/api/user',
    headers: {
      Authorization: `Bearer ${admin.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    items: expect.any(Array),
    total: expect.any(Number),
  })
})

test('password reset', async () => {
  // try to reset password with invalid token
  let res = await app.inject({
    method: 'post',
    url: '/api/user/resetPassword',
    body: {
      token: '!invalid!',
      password: 'newpassword',
    },
  })
  expect(res).toHaveStatus(403)

  res = await app.inject({
    method: 'post',
    url: '/api/user/requestPasswordReset',
    body: {
      email: 'donald@example.com',
      resetUrl: '/resetPassword?token=',
    },
  })
  expect(res).toHaveStatus(204)

  expect(mockedSendEmail).toHaveBeenCalledTimes(1)
  const emailArgs = mockedSendEmail.mock.calls[0][0]
  expect(emailArgs.to).toStrictEqual(['donald@example.com'])
  expect(emailArgs.body?.html).toMatch(/resetPassword\?token=[a-z0-9]+/)
  const [, token] =
    emailArgs.body?.html.match(/resetPassword\?token=([a-z0-9]+)/) ?? []

  // try to reset password with invalid token
  res = await app.inject({
    method: 'post',
    url: '/api/user/resetPassword',
    body: {
      token,
      password: 'newpassword',
    },
  })
  expect(res).toHaveStatus(204)

  const donald = await login(app, 'donald@example.com', 'newpassword')
  res = await app.inject({
    method: 'get',
    url: '/api/user/current',
    headers: {
      Authorization: `Bearer ${donald.token}`,
    },
  })
  expect(res).toHaveStatus(200)
})
