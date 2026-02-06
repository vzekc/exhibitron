import { FastifyInstance } from 'fastify'
import { initORM, requireAdmin } from '../../db.js'
import {
  convertOdgToSvg,
  extractTableNumbers,
  storeTempSvg,
  retrieveTempSvg,
  deleteTempSvg,
  cleanupExpiredTempFiles,
} from './convert.js'
import { Table } from '../table/entity.js'

export async function registerSeatplanRoutes(app: FastifyInstance) {
  const db = await initORM()

  // Analyze uploaded ODG file
  app.post<{ Params: { key: string } }>(
    '/api/exhibition/:key/seatplan/analyze',
    async (request, reply) => {
      const { exhibition, user } = request.apolloContext
      requireAdmin(user, exhibition)

      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }

      const buffer = await data.toBuffer()

      if (buffer.length === 0) {
        return reply.code(400).send({ error: 'Die hochgeladene Datei ist leer.' })
      }

      // Clean up expired temp files on each analyze call
      await cleanupExpiredTempFiles().catch(() => {})

      // Convert ODG to processed SVG
      let processedSvg: string
      try {
        processedSvg = await convertOdgToSvg(buffer)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return reply.code(400).send({ error: message })
      }

      // Extract table numbers from SVG
      const { tables: tablesInSvg, duplicates } = extractTableNumbers(processedSvg)

      if (tablesInSvg.length === 0) {
        return reply.code(400).send({
          error:
            'Keine Tische in der hochgeladenen Datei gefunden. Die Datei muss Elemente mit dem Titel "table" enthalten.',
        })
      }

      if (duplicates.length > 0) {
        return reply.code(400).send({
          error: `Doppelte Tischnummern in der hochgeladenen Datei: ${duplicates.join(', ')}`,
        })
      }

      // Store processed SVG in temp file
      const token = await storeTempSvg(processedSvg)

      // Get current DB tables for this exhibition
      const dbTables = await db.table.find(
        { exhibition },
        { populate: ['exhibitor', 'exhibitor.user', 'exhibits'] },
      )
      const tablesInDb = dbTables.map((t) => t.number).sort((a, b) => a - b)

      const tablesInDbSet = new Set(tablesInDb)
      const tablesInSvgSet = new Set(tablesInSvg)

      const tablesToCreate = tablesInSvg.filter((n) => !tablesInDbSet.has(n))
      const tablesToDelete = tablesInDb.filter((n) => !tablesInSvgSet.has(n))

      const occupiedTablesToDelete = dbTables
        .filter((t) => tablesToDelete.includes(t.number) && t.exhibitor)
        .map((t) => ({
          number: t.number,
          exhibitor: t.exhibitor!.user.fullName || t.exhibitor!.user.nickname || 'Unknown',
          exhibitCount: t.exhibits.count(),
        }))

      return {
        token,
        tablesInSvg,
        tablesInDb,
        tablesToCreate,
        tablesToDelete,
        occupiedTablesToDelete,
      }
    },
  )

  // Import seatplan after user confirmation
  app.post<{ Params: { key: string } }>(
    '/api/exhibition/:key/seatplan/import',
    async (request, reply) => {
      const { exhibition, user, db: ctxDb } = request.apolloContext
      requireAdmin(user, exhibition)

      const { token, createTables, deleteTables } = request.body as {
        token: string
        createTables: number[]
        deleteTables: number[]
      }

      if (!token) {
        return reply.code(400).send({ error: 'Missing token' })
      }

      // Retrieve SVG from temp file
      let svgContent: string
      try {
        svgContent = await retrieveTempSvg(token)
      } catch {
        return reply.code(400).send({ error: 'Token expired or invalid. Please re-upload.' })
      }

      // Store SVG in exhibition
      exhibition.seatplanSvg = svgContent

      // Create new tables
      if (createTables?.length) {
        for (const number of createTables) {
          const table = ctxDb.em.create(Table, { exhibition, number })
          ctxDb.em.persist(table)
        }
      }

      // Delete tables (unlink exhibitors/exhibits first)
      if (deleteTables?.length) {
        const tablesToRemove = await ctxDb.table.find({
          exhibition,
          number: { $in: deleteTables },
        })
        for (const table of tablesToRemove) {
          // Unlink exhibits from this table
          const exhibits = await ctxDb.exhibit.find({ table })
          for (const exhibit of exhibits) {
            exhibit.table = undefined
          }
          // Unlink exhibitor
          table.exhibitor = undefined
          ctxDb.em.remove(table)
        }
      }

      await ctxDb.em.flush()

      // Clean up temp file
      await deleteTempSvg(token).catch(() => {})

      return { success: true }
    },
  )

  // Serve stored seatplan SVG
  app.get<{ Params: { key: string } }>('/api/exhibition/:key/seatplan', async (request, reply) => {
    const { exhibition } = request.apolloContext

    if (!exhibition.seatplanSvg) {
      return reply.code(404).send({ error: 'No seatplan available' })
    }

    reply.header('Content-Type', 'image/svg+xml')
    reply.header('Cache-Control', 'no-cache')
    return exhibition.seatplanSvg
  })
}
