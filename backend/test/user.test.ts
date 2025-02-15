import { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { initTestApp } from './utils.js';

let app: FastifyInstance;

beforeAll(async () => {
  // we use different ports to allow parallel testing
  app = await initTestApp(30002);
});

afterAll(async () => {
  // we close only the fastify app - it will close the database connection via onClose hook automatically
  await app?.close();
});

test('login', async () => {
  const res1 = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      email: 'foo@bar.com',
      password: 'password123',
    },
  });

  expect(res1.statusCode).toBe(200);
  expect(res1.json()).toMatchObject({
    fullName: 'Foo Bar',
  });

  const res2 = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      email: 'foo@bar.com',
      password: 'password456',
    },
  });

  expect(res2.statusCode).toBe(401);
  expect(res2.json()).toMatchObject({ error: 'Invalid combination of email and password' });
});

test('update', async () => {
  const res1 = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      email: 'foo@bar.com',
      password: 'password123',
    },
  });

  expect(res1.statusCode).toBe(200);
  const user = res1.json();
  expect(user).toMatchObject({
    fullName: 'Foo Bar',
  });

  const res2 = await app.inject({
    method: 'get',
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  expect(res2.statusCode).toBe(200);
  expect(res2.json()).toMatchObject({ email: 'foo@bar.com' });

  const res3 = await app.inject({
    method: 'patch',
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      bio: 'I was born with a plastic spoon in my mouth'
    }
  })
  expect(res3.statusCode).toBe(200);

  const res4 = await app.inject({
    method: 'get',
    url: '/user/profile',
    headers: {
      Authorization: `Bearer ${user.token}`,
    }
  })
  expect(res4.statusCode).toBe(200);
  expect(res4.json()).toMatchObject({ bio: 'I was born with a plastic spoon in my mouth' });
});
