import { describe, afterAll, beforeAll, expect, test } from 'vitest'
import { FastifyInstance } from 'fastify'
import { deleteDatabase, initTestApp, login } from '../../test/utils.js'

let app: FastifyInstance
let dbName: string

describe('registration', () => {
  beforeAll(async () => {
    ;({ app, dbName } = await initTestApp())
  })

  afterAll(async () => {
    // we close only the fastify app - it will close the database connection via onClose hook automatically
    await app.close()
    deleteDatabase(dbName)
  })

  test('create', async () => {
    const res = await app.inject({
      method: 'post',
      url: '/api/registration/cc2025',
      payload: {
        name: 'John Doe',
        email: 'john@doe.com',
        nickname: 'johnny',
        topic: 'ZX Spectrum',
        message: 'Hello!',
        data: { key: 'value' },
      },
    })
    expect(res).toHaveStatus(200)
  })

  test('create duplicate', async () => {
    await app.inject({
      method: 'post',
      url: '/api/registration/cc2025',
      payload: {
        name: 'John Doe',
        email: 'john@doe.com',
        nickname: 'johnny',
        topic: 'ZX Spectrum',
        message: 'Hello!',
        data: { key: 'value' },
      },
    })
    const res = await app.inject({
      method: 'post',
      url: '/api/registration/cc2025',
      payload: {
        name: 'John Doe',
        email: 'john@doe.com',
        nickname: 'johnny',
        topic: 'ZX Spectrum',
        message: 'Hello again!',
        data: { key: 'value' },
      },
    })
    expect(res).toHaveStatus(409)
    expect(res.json()).toMatchObject({
      error: 'The email address is already registered',
    })
  })

  test('retrieve all', async () => {
    const admin = await login(app, 'admin@example.com')
    const res = await app.inject({
      method: 'get',
      url: '/api/registration/cc2025',
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

  test('retrieve all without admin rights', async () => {
    const user = await login(app, 'donald@example.com')
    const res = await app.inject({
      method: 'get',
      url: '/api/registration/cc2025',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
    expect(res).toHaveStatus(403)
    expect(res.json()).toMatchObject({
      error: 'Must be logged as administrator to retrieve registrations',
    })
  })

  test('update', async () => {
    const admin = await login(app, 'admin@example.com')

    // Retrieve the registration before the update
    let res = await app.inject({
      method: 'get',
      url: '/api/registration/cc2025/1',
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(200)
    const originalRegistration = res.json()

    // Perform the update
    res = await app.inject({
      method: 'patch',
      url: '/api/registration/cc2025/1',
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
      payload: {
        name: 'Jane Doe',
        message: 'Updated message',
      },
    })
    expect(res).toHaveStatus(204)

    // Retrieve the registration after the update
    res = await app.inject({
      method: 'get',
      url: '/api/registration/cc2025/1',
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(200)
    const updatedRegistration = res.json()

    // Verify that only the requested changes have been made
    expect(updatedRegistration.name).toBe('Jane Doe')
    expect(updatedRegistration.message).toBe('Updated message')
    expect(updatedRegistration.email).toBe(originalRegistration.email)
    expect(updatedRegistration.nickname).toBe(originalRegistration.nickname)
    expect(updatedRegistration.topic).toBe(originalRegistration.topic)
    expect(updatedRegistration.data).toEqual(originalRegistration.data)
  })

  test('deny update of status field', async () => {
    const admin = await login(app, 'admin@example.com')

    // Perform the update
    const res = await app.inject({
      method: 'patch',
      url: '/api/registration/cc2025/1',
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
      payload: {
        status: 'approved',
      },
    })
    expect(res).toHaveStatus(400)
  })

  test('update without admin rights', async () => {
    const user = await login(app, 'donald@example.com')
    const res = await app.inject({
      method: 'patch',
      url: '/api/registration/cc2025/1',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      payload: {
        name: 'Jane Doe',
        message: 'Updated message',
      },
    })
    expect(res).toHaveStatus(403)
    expect(res.json()).toMatchObject({
      error: 'Must be logged as administrator to update registrations',
    })
  })

  test('update nonexistent', async () => {
    const admin = await login(app, 'admin@example.com')
    const res = await app.inject({
      method: 'patch',
      url: '/api/registration/cc2025/9999',
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
      payload: {
        name: 'Jane Doe',
        message: 'Updated message',
      },
    })
    expect(res).toHaveStatus(404)
    expect(res.json()).toMatchObject({
      error: 'Registration not found ({ id: 9999 })',
    })
  })

  test('approve, reject and delete registration', async () => {
    const admin = await login(app, 'admin@example.com')

    // Create a new registration
    let res = await app.inject({
      method: 'post',
      url: '/api/registration/cc2025',
      payload: {
        name: 'Hinz Kunz',
        email: 'hinz@kunz.com',
        nickname: 'hinz',
        topic: 'ZX Spectrum',
        message: 'Hello!',
        data: { key: 'value' },
      },
    })
    expect(res).toHaveStatus(200)
    const registrationId = res.json().id as string

    // Set the registration to in progress
    res = await app.inject({
      method: 'put',
      url: `/api/registration/cc2025/${registrationId}/inProgress`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(204)

    res = await app.inject({
      method: 'get',
      url: `/api/registration/cc2025/${registrationId}`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(200)
    expect(res.json().status).toBe('inProgress')

    // Approve the registration
    res = await app.inject({
      method: 'put',
      url: `/api/registration/cc2025/${registrationId}/approve`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(204)

    res = await app.inject({
      method: 'get',
      url: `/api/registration/cc2025/${registrationId}`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(200)
    expect(res.json().status).toBe('approved')

    // Try to delete registration (must fail)
    res = await app.inject({
      method: 'delete',
      url: `/api/registration/cc2025/${registrationId}`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(409)

    // Reject the registration
    res = await app.inject({
      method: 'put',
      url: `/api/registration/cc2025/${registrationId}/reject`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(204)

    res = await app.inject({
      method: 'get',
      url: `/api/registration/cc2025/${registrationId}`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(200)
    expect(res.json().status).toBe('rejected')

    // Delete the registration
    res = await app.inject({
      method: 'delete',
      url: `/api/registration/cc2025/${registrationId}`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(204)

    res = await app.inject({
      method: 'get',
      url: `/api/registration/cc2025/${registrationId}`,
      headers: {
        Authorization: `Bearer ${admin.token}`,
      },
    })
    expect(res).toHaveStatus(404)
  })
})
