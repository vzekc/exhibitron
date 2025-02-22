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

test('claim and release', async () => {
  const donald = await login(app, 'donald')
  const daffy = await login(app, 'daffy')
  const admin = await login(app, 'admin')

  const tablePost = (url: string, user: { token: string }) =>
    app.inject({
      method: 'post',
      url: `/api${url}`,
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })

  // verify table can be claimed
  let res = await tablePost('/table/1/claim', donald)
  expect(res).toHaveStatus(204)

  // verify that it can be claimed again
  res = await tablePost('/table/1/claim', donald)
  expect(res).toHaveStatus(204)

  // verify that daffy cannot claim donald's table
  res = await tablePost('/table/1/claim', daffy)
  expect(res).toHaveStatus(403)

  // verify that daffy cannot release donald's table
  res = await tablePost('/table/1/release', daffy)
  expect(res).toHaveStatus(403)

  // verify that table can be released
  res = await tablePost('/table/1/release', donald)
  expect(res).toHaveStatus(204)

  // expect that daffy can claim the table now
  res = await tablePost('/table/1/claim', daffy)
  expect(res).toHaveStatus(204)

  // verify that admin can release daffy's table
  res = await tablePost('/table/1/release', admin)
  expect(res).toHaveStatus(204)

  // expect that donald can claim the table now
  res = await tablePost('/table/1/claim', donald)
  expect(res).toHaveStatus(204)

  // Have administrator assign table 2 to donald
  res = await tablePost('/table/2/assign-to/donald', admin)
  expect(res).toHaveStatus(204)

  // expect that daffy cannot claim the table now
  res = await tablePost('/table/2/claim', daffy)
  expect(res).toHaveStatus(403)

  // expect that donald can claim the table now (already owns it)
  res = await tablePost('/table/2/claim', donald)
  expect(res).toHaveStatus(204)

  // expect that the table is reported as free
  res = await app.inject({ method: 'get', url: '/api/table/7' })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({ exhibitor: null })

  // expect that donald can claim the table
  res = await tablePost('/table/7/claim', donald)
  expect(res).toHaveStatus(204)

  // check that donald is now the owner of the table
  res = await app.inject({ method: 'get', url: '/api/table/7' })
  expect(res).toHaveStatus(200)
  expect(res.json()).toMatchObject({ exhibitor: { username: 'donald' } })

  // check that a nonexistent table is correctly reported
  res = await app.inject({ method: 'get', url: '/api/table/2000' })
  expect(res).toHaveStatus(404)
})
