import { Context } from '../../app/context.js'
import {
  AttributeInput,
  ExhibitResolvers,
  MutationResolvers,
  QueryResolvers,
} from '../../generated/graphql.js'
import { Exhibit, ExhibitImage } from './entity.js'
import { wrap, QueryOrder } from '@mikro-orm/core'
import { ExhibitAttribute } from '../exhibitAttribute/entity.js'

// Helper function to process attributes and update the ExhibitAttribute table
async function processAttributes(
  attributeInputs: AttributeInput[] | null | undefined,
  db: Context['db'],
): Promise<[string, string][] | undefined> {
  if (!attributeInputs || attributeInputs.length === 0) return undefined

  // Store attributes as array of [name, value] pairs to preserve order and allow duplicates
  const attributesArray: [string, string][] = attributeInputs.map((attr) => [attr.name, attr.value])

  // Get all attribute names from the incoming attributes
  const attributeNames = [...new Set(attributeInputs.map((attr) => attr.name))]

  // Find existing attributes
  const existingAttributes = await db.exhibitAttribute.find({ name: { $in: attributeNames } })
  const existingAttributeNames = existingAttributes.map((attr) => attr.name)

  // Find new attributes that need to be created
  const newAttributeNames = attributeNames.filter((name) => !existingAttributeNames.includes(name))

  // Create new attributes if needed
  if (newAttributeNames.length > 0) {
    const newAttributes = newAttributeNames.map((name) => db.em.create(ExhibitAttribute, { name }))
    await db.em.persist(newAttributes).flush()
  }

  return attributesArray
}

export const exhibitQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getExhibit: async (_, { id }, { db }) => db.exhibit.findOneOrFail({ id }),
  // @ts-expect-error ts2345
  getExhibits: async (_, _args, { db, exhibition }) =>
    db.exhibit
      .find({ exhibition }, { orderBy: { title: QueryOrder.ASC } })
      .then((exhibits) =>
        exhibits.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase())),
      ),
}

export const exhibitMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createExhibit: async (
    _,
    { title, description, descriptionExtension, table, attributes },
    { exhibition, exhibitor, db },
  ) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an exhibit')
    }

    // Process attributes if provided
    const processedAttributes = await processAttributes(
      attributes as AttributeInput[] | null | undefined,
      db,
    )

    // Look up the table by number if provided
    let tableEntity = null
    if (table) {
      tableEntity = await db.table.findOneOrFail({
        exhibition,
        number: table,
      })
    }

    const exhibit = db.em.getRepository(Exhibit).create({
      exhibition,
      title,
      description: null,
      descriptionExtension: null,
      table: tableEntity,
      exhibitor,
      attributes: processedAttributes,
    })

    if (description) {
      exhibit.description = await db.document.ensureDocument(exhibit.description, description)
    }

    if (descriptionExtension) {
      exhibit.descriptionExtension = await db.document.ensureDocument(
        exhibit.descriptionExtension,
        descriptionExtension,
      )
    }

    await db.em.persist(exhibit).flush()
    return exhibit
  },
  // @ts-expect-error ts2345
  updateExhibit: async (
    _,
    { id, description, descriptionExtension, attributes, ...rest },
    { db, exhibitor, user },
  ) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    if (exhibitor !== exhibit.exhibitor && !user?.isAdministrator) {
      throw new Error('You do not have permission to update this exhibit')
    }

    // Process attributes if provided
    let processedAttributes = exhibit.attributes
    if (attributes !== undefined) {
      processedAttributes = await processAttributes(
        attributes as AttributeInput[] | null | undefined,
        db,
      )
    }

    let table = exhibit.table || null
    if ('table' in rest) {
      table = rest.table
        ? await db.table.findOneOrFail({
            exhibition: exhibit.exhibition,
            number: rest.table,
          })
        : null
      delete rest.table
    }

    if (description) {
      exhibit.description = await db.document.ensureDocument(exhibit.description, description)
    }
    if (descriptionExtension) {
      exhibit.descriptionExtension = await db.document.ensureDocument(
        exhibit.descriptionExtension,
        descriptionExtension,
      )
    }

    const updatedExhibit = wrap(exhibit).assign({ table, attributes: processedAttributes, ...rest })
    await db.em.persist(updatedExhibit).flush()
    return updatedExhibit
  },
  deleteExhibit: async (_, { id }, { db, exhibitor, user }) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    if (exhibitor !== exhibit.exhibitor && !user?.isAdministrator) {
      throw new Error('You do not have permission to delete this exhibit')
    }
    db.em.remove(exhibit)
    return true
  },
}

export const exhibitTypeResolvers: ExhibitResolvers = {
  exhibitor: async (exhibit, _, { db }) => db.exhibitor.findOneOrFail({ id: exhibit.exhibitor.id }),
  table: async (exhibit, _, { db }) =>
    exhibit.table ? db.table.findOneOrFail({ id: exhibit.table.id }) : null,
  host: async (exhibit, _, { db }) =>
    exhibit.host ? db.host.findOneOrFail({ id: exhibit.host.id }) : null,
  attributes: (exhibit) => {
    if (!exhibit.attributes) return null

    // Convert array of [name, value] pairs to array of AttributeValue objects
    return (exhibit.attributes as unknown as Array<[string, string]>).map(([name, value]) => ({
      name,
      value,
    }))
  },
  mainImage: (exhibit) => {
    if (!exhibit.mainImage) return null

    const image = exhibit.mainImage as unknown as ExhibitImage
    return image.id
  },
  description: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    return exhibitEntity.description?.html ?? ''
  },
  descriptionExtension: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    return exhibitEntity.descriptionExtension?.html ?? ''
  },
}

export const exhibitResolvers = {
  Query: exhibitQueries,
  Mutation: exhibitMutations,
  Exhibit: exhibitTypeResolvers,
}
