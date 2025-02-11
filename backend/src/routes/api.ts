import 'dotenv/config'

import Koa from 'koa'
import Router from 'koa-router'
import sanitizeHtml from 'sanitize-html'
import { validate as validateUuid } from 'uuid'
import { PoolClient } from 'pg'

import { isAuthenticated, isAdmin } from '../auth'

const sanitzeHtmlOptions = {
  allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'pre', 'img', 'a'],
  allowedSchemes: ['http', 'https', 'data'],
}

const router = new Router({ prefix: '/api' });

router.post('/exhibition', isAdmin, async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const { title, description, owner } = ctx.request.body
  const result = await client.query(
    `
        INSERT INTO exhibition(title, description, owner)
        VALUES ($1, $2, $3)
        RETURNING id`,
    [title, sanitizeHtml(description, sanitzeHtmlOptions), owner]
  )
  ctx.body = result.rows[0]
  ctx.status = 200
})

export type Exhibition = {
  id: string;
  username: string;
  title: string;
  description: string;
  table_numbers: number[];
}

const makeExhibitionsQuery =
  (where?: string) => `SELECT e.id,
                              u.name         AS "username",
                              e.title,
                              e.description,
                              COALESCE(ARRAY_AGG(t.number ORDER BY t.number) FILTER (WHERE t.number IS NOT NULL),
                                       '{}') AS table_numbers
                       FROM exhibition AS e
                                JOIN "user" u ON e.owner = u.id
                                LEFT JOIN tables t ON t.exhibition = e.id
                           ${where ?? ''}
                       GROUP BY e.id, u.name, e.title, e.description`

router.get('/exhibition', async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const result = await client.query(makeExhibitionsQuery())
  ctx.body = { exhibitions: result.rows as Exhibition[] }
  ctx.status = 200
})

router.get('/exhibition/:id', async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const { id } = ctx.params
  if (!validateUuid(id)) {
    ctx.body = { message: "invalid UUID", id}
    ctx.status = 400
    return
  }
  const result = await client.query(makeExhibitionsQuery(`WHERE e.id = '${id}'`))
  if (result.rows.length) {
    ctx.body = result.rows[0] as Exhibition
    ctx.status = 200
  } else {
    ctx.body = { message: "exhibition not found", id }
    ctx.status = 404
  }
})

router.get('/table/:number', async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const { number } = ctx.params
  if (!number?.match(/^\d+$/)) {
    ctx.body = { message: "invalid table number", number}
    ctx.status = 400
    return
  }
  const result = await client.query('SELECT exhibition FROM tables WHERE number = $1', [number]);
  if (result.rows[0]?.exhibition) {
    ctx.redirect(`/api/exhibition/${result.rows[0]?.exhibition}`)
  } else if (result.rows.length) {
    ctx.body = { message: "table not assigned", number }
    ctx.status = 400
  } else {
    ctx.body = { message: "table not found", number }
    ctx.status = 404
  }
})

router.put(
  '/exhibition/:id',
  isAuthenticated,
  async (ctx: Koa.Context) => {
    const client = ctx.state.db
    const { id } = ctx.params
    // Validate the description field
    const { title, description } = ctx.request.body
    const result = await client.query(
      `
          UPDATE exhibition
          SET title       = COALESCE($2, title),
              description = COALESCE($3, description)
          WHERE id = $1
            AND ((owner = $4) OR $5)
          RETURNING id`,
      [
        id,
        title,
        sanitizeHtml(description, sanitzeHtmlOptions),
        ctx.state.user.id,
        ctx.state.user.is_admin,
      ]
    )
    ctx.status = result.rows[0]?.id ? 204 : 400
  }
)

export default router
