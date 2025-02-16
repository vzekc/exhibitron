import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { z } from 'zod'
import { PermissionDeniedError } from '../common/utils.js'
import { wrap } from '@mikro-orm/core'
import { Exhibition } from './exhibition.entity.js'
import { User } from '../user/user.entity.js';
import { Table } from './table.entity.js';

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
    table: table?.number,
    exhibitor: exhibitor.fullName,
  })

export async function registerExhibitionRoutes(app: FastifyInstance) {
  const db = await initORM()

  const getOwnedTable = async (user: User, tableNumber: number) => {
    const table = await db.table.findOneOrFail({ number: tableNumber })
    if (table.exhibitor && table.exhibitor !== user) {
      throw new PermissionDeniedError(
        'The requested table is assigned to another exhibitor',
      )
    }
    table.exhibitor = user
    return table
  }

  app.post('/', async (request) => {
    if (!request.user) {
      throw new PermissionDeniedError(
        'You need to be logged in to create exhibitions',
      )
    }
    const props = exhibitionCreateSchema.parse(request.body)
    let table: Table | undefined = undefined
    if (props.table) {
      table = await getOwnedTable(request.user, props.table)
      delete props.table
    }
    const exhibition = db.exhibition.create({
      ...props,
      exhibitor: request.user,
      table
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
      exhibition.table = await getOwnedTable(request.user, dto.table)
      delete dto.table
    }
    wrap(exhibition).assign(dto)
    await db.em.flush()
    return makeResponseDto(exhibition)
  })
}
