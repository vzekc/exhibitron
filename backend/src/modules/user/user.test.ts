import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { deleteDatabase, initTestApp, login } from '../../test/utils.js'

let app: FastifyInstance
let dbName: string

beforeAll(async () => {
  ;({ app, dbName } = await initTestApp())
})

afterAll(async () => {
  // we close only the fastify app - it will close the database connection via onClose hook automatically
  await app.close()
  deleteDatabase(dbName)
})

test('login', async () => {
  let res = await app.inject({
    method: 'post',
    url: '/api/user/sign-in',
    payload: {
      username: 'MeisterEder',
      password: 'password123',
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toStrictEqual({
    username: 'MeisterEder',
    fullName: 'Harald Eder',
    token: expect.stringMatching(/.*/),
    bio: '',
    contacts: {},
    id: 1001,
    isAdministrator: false,
    exhibits: expect.any(Array),
    tables: expect.any(Array),
  })

  expect(res.body).not.toContain('password')
  res = await app.inject({
    method: 'post',
    url: '/api/user/sign-in',
    payload: {
      username: 'MeisterEder',
      password: 'password456',
    },
  })
  expect(res).toHaveStatus(401)
  expect(res.json()).toMatchObject({
    error: 'Invalid combination of username and password',
  })
})

test('update', async () => {
  let res = await app.inject({
    method: 'post',
    url: '/api/user/sign-in',
    payload: {
      username: 'MeisterEder',
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
    url: '/api/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({ username: 'MeisterEder' })

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
    url: '/api/user/profile',
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
    username: 'daffy',
    fullName: 'Daffy Duck',
    id: 1002,
    isAdministrator: false,
    bio: expect.anything(),
    contacts: {},
    exhibits: expect.any(Array),
    tables: expect.any(Array),
  })
  res = await app.inject({
    method: 'get',
    url: '/api/user/MeisterEder',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toStrictEqual({
    username: 'MeisterEder',
    fullName: 'Harald Eder',
    id: 1001,
    isAdministrator: false,
    bio: expect.anything(),
    contacts: {},
    exhibits: expect.any(Array),
    tables: expect.any(Array),
  })
})

test('profile', async () => {
  // check that admin has the isAdministrator flag
  const admin = await login(app, 'admin')
  let res = await app.inject({
    method: 'get',
    url: '/api/user/profile',
    headers: {
      Authorization: `Bearer ${admin.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    isAdministrator: true,
  })

  // check that donald does not have isAdministrator set
  const donald = await login(app, 'donald')
  res = await app.inject({
    method: 'get',
    url: '/api/user/profile',
    headers: {
      Authorization: `Bearer ${donald.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    isAdministrator: false,
  })
})
