import { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { initTestApp, deleteDatabase } from '../../test/utils.js'

let app: FastifyInstance
let dbName: string

beforeAll(async () => {
  ;({ app, dbName } = await initTestApp())
})

afterAll(async () => {
  // we close only the fastify app - it will close the database connection via onClose hook automatically
  await app.close()
  await deleteDatabase(dbName)
})

test('login', async () => {
  const res1 = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      username: 'MeisterEder',
      password: 'password123',
    },
  })

  expect(res1.statusCode).toBe(200)
  expect(res1.json()).toMatchObject({
    fullName: 'Harald Eder',
  })

  const res2 = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      username: 'MeisterEder',
      password: 'password456',
    },
  })

  expect(res2.statusCode).toBe(401)
  expect(res2.json()).toMatchObject({
    error: 'Invalid combination of username and password',
  })
})

test('update', async () => {
  const res1 = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      username: 'MeisterEder',
      password: 'password123',
    },
  })

  expect(res1.statusCode).toBe(200)
  const user = res1.json()
  expect(user).toMatchObject({
    fullName: 'Harald Eder',
  })

  const res2 = await app.inject({
    method: 'get',
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  })
  expect(res2.statusCode).toBe(200)
  expect(res2.json()).toMatchObject({ username: 'MeisterEder' })

  const res3 = await app.inject({
    method: 'patch',
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      bio: 'I was born with a plastic spoon in my mouth',
    },
  })
  expect(res3.statusCode).toBe(200)

  const res4 = await app.inject({
    method: 'get',
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  })
  expect(res4.statusCode).toBe(200)
  expect(res4.json()).toMatchObject({
    bio: 'I was born with a plastic spoon in my mouth',
  })
})

test('lookups', async () => {
  let res = await app.inject({
    method: 'get',
    url: '/user/1002'
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
})
