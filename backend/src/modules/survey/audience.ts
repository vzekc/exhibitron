import { Services } from '../../db.js'
import { SurveyAudience } from '../../generated/graphql.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Table } from '../table/entity.js'
import { Audiences } from './answers.js'

/*
 * Who belongs to which audience is read from what the site already knows.
 * Fotofix: the exhibitor holds a table that shows visitor photos.
 */
export const audiencesOf = async (db: Services, exhibitor: Exhibitor): Promise<Audiences> => {
  const audiences: Audiences = new Set()
  if (await db.em.count(Table, { exhibitor, showsVisitorPhotos: true })) {
    audiences.add(SurveyAudience.Fotofix)
  }
  return audiences
}

/* The exhibitors of an exhibition a question with this audience is put to. */
export const membersOf = async (
  db: Services,
  exhibition: Exhibition,
  audience: SurveyAudience | undefined | null,
): Promise<Exhibitor[]> => {
  if (!audience) return db.exhibitor.find({ exhibition })
  const tables = await db.em.find(
    Table,
    { exhibition, showsVisitorPhotos: true, exhibitor: { $ne: null } },
    { populate: ['exhibitor'] },
  )
  const seen = new Set<number>()
  return tables
    .map((table) => table.exhibitor!)
    .filter((exhibitor) => !seen.has(exhibitor.id) && seen.add(exhibitor.id))
}
