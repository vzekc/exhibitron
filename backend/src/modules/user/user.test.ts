import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { initTestApp, deleteDatabase, login } from '../../test/utils.js'

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
    url: '/user/sign-in',
    payload: {
      username: 'MeisterEder',
      password: 'password123',
    },
  })

  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    fullName: 'Harald Eder',
  })

  res = await app.inject({
    method: 'post',
    url: '/user/sign-in',
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
    url: '/user/sign-in',
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
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({ username: 'MeisterEder' })

  res = await app.inject({
    method: 'patch',
    url: '/user/profile',
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
    url: '/user/profile',
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
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      isAdministrator: true,
    },
  })
  expect(res).toHaveStatus(400)
  // fixme: should really look at the validation error
  expect(res.body).toMatch(/additionalProperty.*isAdministrator/)
})

test('lookups', async () => {
  let res = await app.inject({
    method: 'get',
    url: '/user/1002',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).not.toContain('password')
  expect(res.json()).toMatchObject({
    username: 'daffy',
    fullName: 'Daffy Duck',
  })
  res = await app.inject({
    method: 'get',
    url: '/user/MeisterEder',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    username: 'MeisterEder',
    fullName: 'Harald Eder',
  })
})

test('profile', async () => {
  // check that admin has the isAdministrator flag
  const admin = await login(app, 'admin')
  let res = await app.inject({
    method: 'get',
    url: '/user/profile',
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
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${donald.token}`,
    },
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    isAdministrator: false,
  })
})
