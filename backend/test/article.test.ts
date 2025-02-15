import { afterAll, beforeAll, expect, test } from 'vitest';
import { FastifyInstance } from 'fastify';
import { initTestApp } from './utils.js';

let app: FastifyInstance;

beforeAll(async () => {
  // we use different ports to allow parallel testing
  app = await initTestApp(30001);
});

afterAll(async () => {
  // we close only the fastify app - it will close the database connection via onClose hook automatically
  await app.close();
});

test('list all articles', async () => {
  // mimic the http request via `app.inject()`
  const res = await app.inject({
    method: 'get',
    url: '/article',
  });

  // assert it was successful response
  expect(res.statusCode).toBe(200);

  // with expected shape
  expect(res.json()).toMatchObject({
    items: [
      { authorName: 'Foo Bar', slug: 'title-13', title: 'title 1/3' },
      { authorName: 'Foo Bar', slug: 'title-23', title: 'title 2/3' },
      { authorName: 'Foo Bar', slug: 'title-33', title: 'title 3/3' },
    ],
    total: 3,
  });
});

const login = async () => {
  const res = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      email: 'foo@bar.com',
      password: 'password123',
    },
  });

  expect(res.statusCode).toBe(200);
  return res.json();
};

test('comment on article', async () => {
  const user = await login();

  // get articles
  const res2 = await app.inject({
    method: 'get',
    url: '/article',
  });
  expect(res2.statusCode).toBe(200);

  const { slug } = res2.json().items[0];
  expect(slug).toBe('title-13');

  // test comment posting
  const res3 = await app.inject({
    method: 'post',
    url: `/article/${slug}/comment`,
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
    payload: {
      text: 'this is the first comment',
    },
  });
  expect(res3.statusCode).toBe(200);

  const res4 = await app.inject({
    method: 'get',
    url: `/article/${slug}`,
  });
  expect(res4.statusCode).toBe(200);
  const article = res4.json();
  expect(article.comments.length).toBe(1);
  const comment = article.comments[0];
  expect(comment).toMatchObject({ text: 'this is the first comment' });
  const author = comment.author;
  expect(author).toMatchObject({ email: 'foo@bar.com' });
});
