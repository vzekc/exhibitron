import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { z } from 'zod'
import { wrap } from '@mikro-orm/core'
import { Exhibition } from './exhibition.entity.js'
import { Table } from '../table/table.entity.js'
import { PermissionDeniedError } from '../common/errors.js'

const exhibitionCreateSchema = z
  .object({
    title: z.string(),
    text: z.string().optional(),
    table: z.number().optional(),
  })
  .strict()

const exhibitionUpdateSchema = z
  .object({
    title: z.string().optional(),
    text: z.string().optional(),
    table: z.number().optional(),
  })
  .strict()

const exhibitionSchema = z
  .object({
    id: z.number(),
    exhibitor: z.string(),
    title: z.string(),
    text: z.string().optional(),
    table: z.number().optional(),
  })
  .strict()

const makeResponseDto = ({ id, title, text, table, exhibitor }: Exhibition) =>
  exhibitionSchema.parse({
    id,
    title,
    text: text || undefined,
    table: table?.id,
    exhibitor: exhibitor.username,
  })

export async function registerExhibitionRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.post('/', async (request) => {
    if (!request.user) {
      throw new PermissionDeniedError(
        'You need to be logged in to create exhibitions',
      )
    }
    const props = exhibitionCreateSchema.parse(request.body)
    let table: Table | undefined = undefined
    if (props.table) {
      table = await db.table.claim(props.table, request.user)
      delete props.table
    }
    const exhibition = db.exhibition.create({
      ...props,
      exhibitor: request.user,
      table,
    })
    await db.em.flush()
    return makeResponseDto(exhibition)
  })

  app.get('/', async (request) => {
    const { limit, offset } = request.query as {
      limit?: number
      offset?: number
    }
    const { items, total } = await db.exhibition.listExhibitions({
      limit,
      offset,
    })

    return { items, total }
  })

  app.get('/:id', async (request) => {
    const params = request.params as { id: string }
    const exhibition = await db.exhibition.findOneOrFail(+params.id, {
      populate: ['exhibitor', 'table'],
    })
    return makeResponseDto(exhibition)
  })

  app.patch('/:id', async (request) => {
    const params = request.params as { id: string }
    const exhibition = await db.exhibition.findOneOrFail(+params.id, {
      populate: ['exhibitor', 'table'],
    })
    if (exhibition.exhibitor !== request.user) {
      throw new PermissionDeniedError(
        'You are not authorized to change this exhibition',
      )
    }
    const dto = exhibitionUpdateSchema.parse(request.body)
    if ('table' in dto && dto.table) {
      exhibition.table = await db.table.claim(dto.table, request.user)
      delete dto.table
    }
    wrap(exhibition).assign(dto)
    await db.em.flush()
    return makeResponseDto(exhibition)
  })
}
