import 'dotenv/config'

import Router from 'koa-router'
import sanitizeHtml from 'sanitize-html'
import { validate as validateUuid } from 'uuid'
import { AuthenticatedContext, Context } from '../Context'

import { isAdmin, isAuthenticated } from '../auth'

const sanitzeHtmlOptions = {
  allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'pre', 'img', 'a'],
  allowedSchemes: ['http', 'https', 'data']
}

const router = new Router({ prefix: '/api' })

router.post('/exhibition', isAuthenticated, async (ctx: AuthenticatedContext) => {
  const client = ctx.state.db
  const { title, description, table } = ctx.request.body
  if (table) {
    const result = await client.query('SELECT 1 FROM tables WHERE number = $1 AND owner = $2', [table, ctx.state.user.id])
    if (result.rows.length !== 1) {
      ctx.body = { message: `you have not claimed table ${table}` }
      ctx.status = 403
      return
    }
  }
  const result = await client.query(
    `
        INSERT INTO exhibition(title, description, exhibitor, table_number)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
    [title, sanitizeHtml(description, sanitzeHtmlOptions), ctx.state.user.id, table]
  )
  ctx.body = result.rows[0]
  ctx.status = 200
})

export type Exhibition = {
  id: string
  username: string
  title: string
  description: string
  table_numbers: number[]
}

const makeExhibitionsQuery = (where?: string) => `SELECT e.id,
                                                         u.name AS "username",
                                                         e.title,
                                                         e.description,
                                                         e.table_number)
                                                  FROM exhibition AS e
                                                      JOIN "user" u
                                                  ON e.owner = u.id
                                                      LEFT JOIN TABLES t ON t.exhibition = e.id
                                                      ${where ?? ''}
                                                  GROUP BY e.id, u.name, e.title, e.description`

router.get('/exhibition', async (ctx: Context) => {
  const client = ctx.state.db
  const result = await client.query(makeExhibitionsQuery())
  ctx.body = { exhibitions: result.rows as Exhibition[] }
  ctx.status = 200
})

router.get('/exhibition/:id', async (ctx: Context) => {
  const client = ctx.state.db
  const { id } = ctx.params
  if (!validateUuid(id)) {
    ctx.body = { message: 'invalid UUID', id }
    ctx.status = 400
    return
  }
  const result = await client.query(
    makeExhibitionsQuery(`WHERE e.id = '${id}'`)
  )
  if (result.rows.length) {
    ctx.body = result.rows[0] as Exhibition
    ctx.status = 200
  } else {
    ctx.body = { message: 'exhibition not found', id }
    ctx.status = 404
  }
})

const getTable = async (ctx: Context, number: string) => {
  if (!number?.match(/^\d+$/)) {
    ctx.body = { message: 'invalid table number', number }
    ctx.status = 400
    return
  }

}

router.get('/table/:number', async (ctx: Context) => {
  const client = ctx.state.db
  const table = await getTable(ctx.params.number)
  const result = await client.query(
    'SELECT exhibition FROM tables WHERE number = $1',
    [number]
  )
  if (result.rows[0]?.exhibition) {
    ctx.redirect(`/api/exhibition/${result.rows[0]?.exhibition}`)
  } else if (result.rows.length) {
    ctx.body = { message: 'table not assigned', number }
    ctx.status = 400
  } else {
    ctx.body = { message: 'table not found', number }
    ctx.status = 404
  }
})

router.post('/table/:number/claim', async (ctx: AuthenticatedContext) => {
  const client = ctx.state.db
  const { table } = ctx.params

})

router.put('/exhibition/:id', isAuthenticated, async (ctx: AuthenticatedContext) => {
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
          AND ((exhibitor = $4) OR $5)
        RETURNING id`,
    [
      id,
      title,
      sanitizeHtml(description, sanitzeHtmlOptions),
      ctx.state.user.id,
      ctx.state.user.is_administrator
    ]
  )
  ctx.status = result.rows[0]?.id ? 204 : 400
})

export default router
