import { Context } from '../../app/context.js'
import {
  AttributeInput,
  ExhibitResolvers,
  ExhibitWithExhibitionResolvers,
  MutationResolvers,
  QueryResolvers,
} from '../../generated/graphql.js'
import { Exhibit, ExhibitImage } from './entity.js'
import { wrap, QueryOrder } from '@mikro-orm/core'
import { ExhibitAttribute } from '../exhibitAttribute/entity.js'
import { requireNotFrozen } from '../../db.js'
import { randomUUID } from 'crypto'
import { Document } from '../document/entity.js'

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
  // @ts-expect-error ts2345
  getMyExhibitsFromOtherExhibitions: async (_, _args, { db, user, exhibition }) => {
    if (!user) {
      throw new Error('You must be logged in to view your exhibits')
    }

    // Find all exhibitors for this user in OTHER exhibitions
    const exhibitors = await db.exhibitor.find({
      user,
      exhibition: { $ne: exhibition },
    })

    if (exhibitors.length === 0) {
      return []
    }

    // Find all exhibits for these exhibitors
    const exhibits = await db.exhibit.find(
      { exhibitor: { $in: exhibitors } },
      {
        orderBy: { title: QueryOrder.ASC },
        populate: ['exhibition', 'mainImage.image'],
      },
    )

    return exhibits
  },
}

export const exhibitMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createExhibit: async (
    _,
    { title, touchMe, description, descriptionExtension, table, attributes },
    { exhibition, exhibitor, db },
  ) => {
    requireNotFrozen(exhibition)
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
      touchMe: touchMe ?? false,
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
    { db, exhibitor, user, exhibition },
  ) => {
    requireNotFrozen(exhibition)
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
  deleteExhibit: async (_, { id }, { db, exhibitor, user, exhibition }) => {
    requireNotFrozen(exhibition)
    const exhibit = await db.exhibit.findOneOrFail({ id })
    if (exhibitor !== exhibit.exhibitor && !user?.isAdministrator) {
      throw new Error('You do not have permission to delete this exhibit')
    }
    db.em.remove(exhibit)
    return true
  },
  // @ts-expect-error ts2345
  copyExhibitsToCurrentExhibition: async (
    _,
    { exhibitIds },
    { db, user, exhibitor, exhibition },
  ) => {
    requireNotFrozen(exhibition)

    if (!user) {
      throw new Error('You must be logged in to copy exhibits')
    }
    if (!exhibitor) {
      throw new Error('You must be an exhibitor at the current exhibition to copy exhibits')
    }

    // Fetch the source exhibits with their related entities
    const sourceExhibits = await db.exhibit.find(
      { id: { $in: exhibitIds } },
      { populate: ['exhibitor.user', 'description', 'mainImage.image'] },
    )

    // Verify user owns all requested exhibits
    for (const exhibit of sourceExhibits) {
      if (exhibit.exhibitor.user.id !== user.id) {
        throw new Error(`You do not own exhibit "${exhibit.title}"`)
      }
    }

    const copiedExhibits: Exhibit[] = []

    for (const sourceExhibit of sourceExhibits) {
      // Create new document for description if source has one
      let newDescription: Document | null = null
      if (sourceExhibit.description?.html) {
        newDescription = await db.document.ensureDocument(null, sourceExhibit.description.html)
      }

      // Create new exhibit first (without mainImage)
      const newExhibit = db.em.create(Exhibit, {
        exhibition,
        exhibitor,
        title: sourceExhibit.title,
        touchMe: sourceExhibit.touchMe,
        description: newDescription,
        descriptionExtension: null,
        attributes: sourceExhibit.attributes ? [...sourceExhibit.attributes] : undefined,
      })

      // Create new exhibit image if source has one
      if (sourceExhibit.mainImage?.image) {
        const sourceImage = sourceExhibit.mainImage.image
        // Fetch the full image data
        await db.em.populate(sourceImage, ['data'])

        // Create a new image storage with a new slug
        const newImage = await db.image.createImage(
          sourceImage.data,
          sourceImage.mimeType,
          sourceImage.filename,
          randomUUID(),
        )

        // Create the exhibit image linking to the new image storage and exhibit
        const newMainImage = db.em.create(ExhibitImage, {
          image: newImage,
          exhibit: newExhibit,
        })
        newExhibit.mainImage = newMainImage
      }

      copiedExhibits.push(newExhibit)
    }

    await db.em.persist(copiedExhibits).flush()
    return copiedExhibits
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

export const exhibitWithExhibitionTypeResolvers: ExhibitWithExhibitionResolvers = {
  attributes: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    if (!exhibitEntity.attributes) return null
    return exhibitEntity.attributes.map(([name, value]) => ({ name, value }))
  },
  mainImage: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    if (!exhibitEntity.mainImage) return null
    return exhibitEntity.mainImage.id
  },
  description: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    return exhibitEntity.description?.html ?? ''
  },
  exhibitionTitle: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    return exhibitEntity.exhibition.title
  },
  exhibitionKey: (exhibit) => {
    const exhibitEntity = exhibit as unknown as Exhibit
    return exhibitEntity.exhibition.key
  },
}

export const exhibitResolvers = {
  Query: exhibitQueries,
  Mutation: exhibitMutations,
  Exhibit: exhibitTypeResolvers,
  ExhibitWithExhibition: exhibitWithExhibitionTypeResolvers,
}
