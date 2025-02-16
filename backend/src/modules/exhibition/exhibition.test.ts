import { afterAll, beforeAll, expect, test } from 'vitest'
import { FastifyInstance } from 'fastify'
import { deleteDatabase, initTestApp } from '../../test/utils.js'

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

test('list all exhibitions', async () => {
  // list exhibitions and verify response
  const res = await app.inject({
    method: 'get',
    url: '/exhibition',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    items: [
      {
        id: 1001,
        title: 'The first Macintosh',
        exhibitorId: 1002,
        exhibitorName: 'Daffy Duck',
      },
      {
        id: 1002,
        title: 'Old DEC systems',
        exhibitorId: 1002,
        exhibitorName: 'Daffy Duck',
      },
      {
        id: 1003,
        title: 'IBM Mainframes',
        exhibitorId: 1003,
        exhibitorName: 'Donald Duck',
      },
      {
        id: 1004,
        title: 'HP calculators',
        exhibitorId: 1003,
        exhibitorName: 'Donald Duck',
      },
    ],
    total: 4,
  })
})

test('try making updates without being logged in', async () => {
  const res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1001',
    body: {
      table: 1,
    },
  })
  expect(res).toHaveStatus(403)
})

const login = async (username: string, password: string = 'secret') => {
  const res = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      username,
      password,
    },
  })

  expect(res).toHaveStatus(200)
  return res.json()
}

test('exhibition updates', async () => {
  const user = await login('daffy')

  // reject unknown property
  let res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1001',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      tablex: 1,
    },
  })
  expect(res).toHaveStatus(400)

  // succeed
  res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1001',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      table: 1,
    },
  })
  expect(res).toHaveStatus(200)

  // check that table is assigned
  res = await app.inject({
    method: 'GET',
    url: '/exhibition/1001',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    id: 1001,
    title: 'The first Macintosh',
    table: 1,
  })

  // reject update of exhibition by different user
  res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1003',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      table: 1,
    },
  })
  expect(res).toHaveStatus(403)

  const user2 = await login('donald')

  // deny update to other user's exhibition
  res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1001',
    headers: {
      Authorization: `Bearer ${user2.token}`,
    },
    payload: {
      table: 1,
    },
  })
  expect(res).toHaveStatus(403)

  // deny update to own exhibition and other user's table
  res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1003',
    headers: {
      Authorization: `Bearer ${user2.token}`,
    },
    payload: {
      table: 1,
    },
  })
  expect(res).toHaveStatus(403)

  // suceed updating own exhibition to free table
  res = await app.inject({
    method: 'PATCH',
    url: '/exhibition/1003',
    headers: {
      Authorization: `Bearer ${user2.token}`,
    },
    payload: {
      table: 2,
    },
  })
  expect(res).toHaveStatus(200)

  // verify changes in exhibition list
  res = await app.inject({
    method: 'get',
    url: '/exhibition',
  })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({
    items: [
      {
        id: 1001,
        title: 'The first Macintosh',
        exhibitorId: 1002,
        exhibitorName: 'Daffy Duck',
        table: 1,
      },
      {
        id: 1002,
        title: 'Old DEC systems',
        exhibitorId: 1002,
        exhibitorName: 'Daffy Duck',
      },
      {
        id: 1003,
        title: 'IBM Mainframes',
        exhibitorId: 1003,
        exhibitorName: 'Donald Duck',
        table: 2,
      },
      {
        id: 1004,
        title: 'HP calculators',
        exhibitorId: 1003,
        exhibitorName: 'Donald Duck',
      },
    ],
    total: 4,
  })

  // create new exhibition
  res = await app.inject({
    method: 'post',
    url: '/exhibition',
    headers: {
      Authorization: `Bearer ${user2.token}`,
    },
    payload: {
      title: 'The grossest C64 of all times'
    },
  })
  expect(res).toHaveStatus(200)

  // verify changes new exhibition
  res = await app.inject({
    method: 'get',
    url: '/exhibition',
  })
  expect(res).toHaveStatus(200)
  expect(res.json().items.length).toBe(5)

  // create new exhibition and assign to table
  res = await app.inject({
    method: 'post',
    url: '/exhibition',
    headers: {
      Authorization: `Bearer ${user2.token}`,
    },
    payload: {
      title: 'Was the ZX Spectrum really that good?',
      table: 5,
    },
  })
  expect(res).toHaveStatus(200)

  // verify changes new exhibition
  res = await app.inject({
    method: 'get',
    url: '/exhibition',
  })
  expect(res).toHaveStatus(200)
  expect(res.json().items.length).toBe(6)
})
