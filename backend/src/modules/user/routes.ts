import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { User } from './user.entity.js'
import { getUserFromToken } from '../common/utils.js'
import { z } from 'zod'

const contactsSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  mastodon: z.string().optional(),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
})

const userCreateSchema = z.object({
  username: z.string(),
  fullName: z.string().optional(),
  password: z.string(),
  bio: z.string().optional(),
  social: contactsSchema.optional(),
})

export async function registerUserRoutes(app: FastifyInstance) {
  const db = await initORM()

  // register new user
  app.post('/sign-up', async (request) => {
    const dto = userCreateSchema.parse(request.body)

    if (await db.user.exists(dto.username)) {
      throw new Error(
        'This username is already registered, maybe you want to sign in?',
      )
    }

    const user = db.user.create(dto)
    await db.em.flush()

    user.token = app.jwt.sign({ id: user.id })

    // after flush, we have the `user.id` set
    console.log(`User ${user.id} created`)

    return user
  })

  app.post('/sign-in', async (request) => {
    const { username, password } = request.body as {
      username: string
      password: string
    }
    const user = await db.user.login(username, password)
    user.token = app.jwt.sign({ id: user.id })

    return user
  })

  app.get('/profile', async (request) => getUserFromToken(request))

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string }
    const where = id.match(/^\d+$/) ? { id: +id } : { username: id }
    const user = await db.user.findOneOrFail(where, { populate: ['tables', 'exhibitions']})
    return user
  })

  app.patch('/profile', async (request) => {
    const user = getUserFromToken(request)
    wrap(user).assign(request.body as User)
    await db.em.flush()
    return user
  })
}
