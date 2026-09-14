import { expect, describe } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest, login, Session } from '../../test/server.js'

// Define types for the attribute and exhibit data
interface ExhibitAttributeData {
  id: number
  name: string
}

interface AttributeValue {
  name: string
  value: string
}

interface ExhibitData {
  id: number
  attributes: AttributeValue[] | null
}

// Helper function to create an attribute
const createExhibitAttribute = async (
  graphqlRequest: ExecuteOperationFunction,
  name: string,
  session: Session,
): Promise<ExhibitAttributeData> => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateExhibitAttribute($name: String!) {
        createExhibitAttribute(name: $name) {
          id
          name
        }
      }
    `),
    { name },
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createExhibitAttribute as ExhibitAttributeData
}

// Helper function to create an exhibit with attributes
const createExhibitWithAttributes = async (
  graphqlRequest: ExecuteOperationFunction,
  input: {
    title: string
    table?: number
    description?: string
    attributes?: Array<{ name: string; value: string }>
  },
  session: Session,
): Promise<ExhibitData> => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateExhibit(
        $title: String!
        $table: Int
        $description: String
        $attributes: [AttributeInput!]
      ) {
        createExhibit(
          title: $title
          table: $table
          description: $description
          attributes: $attributes
        ) {
          id
          attributes {
            name
            value
          }
        }
      }
    `),
    input,
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createExhibit as ExhibitData
}

describe('exhibit attribute', () => {
  graphqlTest('create and list attributes as exhibitor', async (graphqlRequest) => {
    // Login as exhibitor
    const exhibitor = await login('daffy@example.com')

    // Create a new attribute
    const attributeName = `test-attribute-${Date.now()}`
    const attribute = await createExhibitAttribute(graphqlRequest, attributeName, exhibitor)

    expect(attribute.name).toBe(attributeName)

    // Get all attributes
    const result = await graphqlRequest(
      graphql(`
        query GetExhibitAttributes {
          getExhibitAttributes {
            id
            name
          }
        }
      `),
    )

    expect(result.errors).toBeUndefined()
    expect(result.data!.getExhibitAttributes).toBeDefined()

    // Check if our new attribute is in the list
    const foundAttribute = result.data!.getExhibitAttributes.find(
      (a: ExhibitAttributeData) => a.name === attributeName,
    )
    expect(foundAttribute).toBeDefined()
    if (foundAttribute) {
      expect(foundAttribute.id).toBe(attribute.id)
    }
  })

  graphqlTest('fail to create attribute when not logged in', async (graphqlRequest) => {
    // Try to create an attribute without being logged in
    const attributeName = `test-attribute-${Date.now()}`
    const result = await graphqlRequest(
      graphql(`
        mutation CreateExhibitAttribute($name: String!) {
          createExhibitAttribute(name: $name) {
            id
            name
          }
        }
      `),
      { name: attributeName },
    )

    expect(result.errors).toBeDefined()
    expect(result.errors![0].message).toBe('You must be logged in to create an attribute')
  })

  graphqlTest('automatically create attributes when used in exhibits', async (graphqlRequest) => {
    // Login as a user
    const user = await login('daffy@example.com')

    // Create unique attribute names for this test
    const attributeName1 = `exhibit-attr-1-${Date.now()}`
    const attributeName2 = `exhibit-attr-2-${Date.now()}`

    // Create an exhibit with new attributes
    const exhibit = await createExhibitWithAttributes(
      graphqlRequest,
      {
        title: 'Exhibit with Attributes',
        attributes: [
          { name: attributeName1, value: 'value1' },
          { name: attributeName2, value: 'value2' },
        ],
      },
      user,
    )

    // Verify the exhibit has the attributes
    expect(exhibit.attributes).toBeDefined()
    if (exhibit.attributes) {
      expect(exhibit.attributes).toHaveLength(2)
      const attr1 = exhibit.attributes.find((a: AttributeValue) => a.name === attributeName1)
      const attr2 = exhibit.attributes.find((a: AttributeValue) => a.name === attributeName2)
      expect(attr1).toBeDefined()
      expect(attr2).toBeDefined()
      if (attr1) expect(attr1.value).toBe('value1')
      if (attr2) expect(attr2.value).toBe('value2')
    }

    // Check if the attributes were automatically added to the attributes table
    const result = await graphqlRequest(
      graphql(`
        query GetExhibitAttributes {
          getExhibitAttributes {
            name
          }
        }
      `),
    )

    expect(result.errors).toBeUndefined()

    // Check if our new attributes are in the list
    const attributeNames = result.data!.getExhibitAttributes.map((a: { name: string }) => a.name)
    expect(attributeNames).toContain(attributeName1)
    expect(attributeNames).toContain(attributeName2)
  })

  graphqlTest('update exhibit attributes', async (graphqlRequest) => {
    // Login as a user
    const user = await login('daffy@example.com')

    // Create an exhibit with attributes
    const attributeName = `update-attr-${Date.now()}`
    const exhibit = await createExhibitWithAttributes(
      graphqlRequest,
      {
        title: 'Exhibit for Update',
        attributes: [{ name: attributeName, value: 'initial-value' }],
      },
      user,
    )

    // Update the exhibit's attributes
    const updatedValue = 'updated-value'
    const newAttributeName = `new-attr-${Date.now()}`

    const updateResult = await graphqlRequest(
      graphql(`
        mutation UpdateExhibit($id: Int!, $attributes: [AttributeInput!]) {
          updateExhibit(id: $id, attributes: $attributes) {
            id
            attributes {
              name
              value
            }
          }
        }
      `),
      {
        id: exhibit.id,
        attributes: [
          { name: attributeName, value: updatedValue },
          { name: newAttributeName, value: 'new-value' },
        ],
      },
      user,
    )

    expect(updateResult.errors).toBeUndefined()

    // Verify the attributes were updated
    const updatedExhibit = updateResult.data!.updateExhibit as ExhibitData
    expect(updatedExhibit).toBeDefined()
    if (updatedExhibit && updatedExhibit.attributes) {
      expect(updatedExhibit.attributes).toHaveLength(2)
      const attr1 = updatedExhibit.attributes.find((a: AttributeValue) => a.name === attributeName)
      const attr2 = updatedExhibit.attributes.find(
        (a: AttributeValue) => a.name === newAttributeName,
      )
      expect(attr1).toBeDefined()
      expect(attr2).toBeDefined()
      if (attr1) expect(attr1.value).toBe(updatedValue)
      if (attr2) expect(attr2.value).toBe('new-value')
    }

    // Check if the new attribute was added to the attributes table
    const attributesResult = await graphqlRequest(
      graphql(`
        query GetExhibitAttributes {
          getExhibitAttributes {
            name
          }
        }
      `),
    )

    const attributeNames = attributesResult.data!.getExhibitAttributes.map(
      (a: { name: string }) => a.name,
    )
    expect(attributeNames).toContain(newAttributeName)
  })

  graphqlTest('delete an attribute as admin', async (graphqlRequest) => {
    // Login as admin
    const admin = await login('admin@example.com')

    // Create a new attribute
    const attributeName = `delete-attr-${Date.now()}`
    const attribute = await createExhibitAttribute(graphqlRequest, attributeName, admin)

    // Delete the attribute
    const deleteResult = await graphqlRequest(
      graphql(`
        mutation DeleteExhibitAttribute($id: Int!) {
          deleteExhibitAttribute(id: $id)
        }
      `),
      { id: attribute.id },
      admin,
    )

    expect(deleteResult.errors).toBeUndefined()
    expect(deleteResult.data!.deleteExhibitAttribute).toBe(true)

    // Verify the attribute is no longer in the list
    const attributesResult = await graphqlRequest(
      graphql(`
        query GetExhibitAttributes {
          getExhibitAttributes {
            id
            name
          }
        }
      `),
    )

    const foundAttribute = attributesResult.data!.getExhibitAttributes.find(
      (a: ExhibitAttributeData) => a.id === attribute.id,
    )
    expect(foundAttribute).toBeUndefined()
  })

  graphqlTest('fail to delete attribute as non-admin', async (graphqlRequest) => {
    // Login as regular exhibitor
    const exhibitor = await login('daffy@example.com')

    // Create a new attribute
    const attributeName = `nodelete-attr-${Date.now()}`
    const attribute = await createExhibitAttribute(graphqlRequest, attributeName, exhibitor)

    // Try to delete the attribute as non-admin
    const deleteResult = await graphqlRequest(
      graphql(`
        mutation DeleteExhibitAttribute($id: Int!) {
          deleteExhibitAttribute(id: $id)
        }
      `),
      { id: attribute.id },
      exhibitor,
    )

    // Should fail with permission error
    expect(deleteResult.errors).toBeDefined()
    expect(deleteResult.errors![0].message).toBe(
      'You must be an administrator to perform this operation',
    )

    // Verify the attribute is still in the list
    const attributesResult = await graphqlRequest(
      graphql(`
        query GetExhibitAttributes {
          getExhibitAttributes {
            id
            name
          }
        }
      `),
    )

    const foundAttribute = attributesResult.data!.getExhibitAttributes.find(
      (a: ExhibitAttributeData) => a.id === attribute.id,
    )
    expect(foundAttribute).toBeDefined()
  })

  const RENAME = graphql(`
    mutation RenameExhibitAttribute($id: Int!, $name: String!) {
      renameExhibitAttribute(id: $id, name: $name) {
        id
        name
        exhibitCount
      }
    }
  `)

  const GET_EXHIBIT = graphql(`
    query GetExhibitAttributesOf($id: Int!) {
      getExhibit(id: $id) {
        id
        attributes {
          name
          value
        }
      }
    }
  `)

  graphqlTest('rename an attribute on every data sheet that carries it', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')
    const oldName = `Model Nrummer ${Date.now()}`
    const newName = `Modell Nummer ${Date.now()}`

    const exhibit = await createExhibitWithAttributes(
      graphqlRequest,
      {
        title: 'Renamed attribute',
        attributes: [
          { name: 'Hersteller', value: 'Siemens' },
          { name: oldName, value: '3504-160' },
          { name: oldName, value: 'FS1511' },
        ],
      },
      user,
    )
    const untouched = await createExhibitWithAttributes(
      graphqlRequest,
      { title: 'Other exhibit', attributes: [{ name: 'Hersteller', value: 'Nixdorf' }] },
      user,
    )

    const list = await graphqlRequest(
      graphql(`
        query GetExhibitAttributesWithCount {
          getExhibitAttributes {
            id
            name
            exhibitCount
          }
        }
      `),
    )
    const attribute = list.data!.getExhibitAttributes.find((a) => a.name === oldName)!
    expect(attribute.exhibitCount).toBe(1)

    const renamed = await graphqlRequest(RENAME, { id: attribute.id, name: newName }, admin)
    expect(renamed.errors).toBeUndefined()
    expect(renamed.data!.renameExhibitAttribute).toMatchObject({
      id: attribute.id,
      name: newName,
      exhibitCount: 1,
    })

    const after = await graphqlRequest(GET_EXHIBIT, { id: exhibit.id }, user)
    expect(after.data!.getExhibit!.attributes).toEqual([
      { name: 'Hersteller', value: 'Siemens' },
      { name: newName, value: '3504-160' },
      { name: newName, value: 'FS1511' },
    ])
    const other = await graphqlRequest(GET_EXHIBIT, { id: untouched.id }, user)
    expect(other.data!.getExhibit!.attributes).toEqual([{ name: 'Hersteller', value: 'Nixdorf' }])
  })

  graphqlTest('renaming to an existing name merges the two', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')
    const stamp = Date.now()
    const duplicate = `Baujahr (Exponat) ${stamp}`
    const canonical = `Baujahr ${stamp}`

    const exhibit = await createExhibitWithAttributes(
      graphqlRequest,
      { title: 'Merged attribute', attributes: [{ name: duplicate, value: '1987' }] },
      user,
    )
    const keep = await createExhibitAttribute(graphqlRequest, canonical, admin)
    const list = await graphqlRequest(
      graphql(`
        query GetExhibitAttributesForMerge {
          getExhibitAttributes {
            id
            name
          }
        }
      `),
    )
    const gone = list.data!.getExhibitAttributes.find((a) => a.name === duplicate)!

    const merged = await graphqlRequest(RENAME, { id: gone.id, name: canonical }, admin)
    expect(merged.errors).toBeUndefined()
    expect(merged.data!.renameExhibitAttribute).toMatchObject({
      id: keep.id,
      name: canonical,
      exhibitCount: 1,
    })

    const after = await graphqlRequest(GET_EXHIBIT, { id: exhibit.id }, user)
    expect(after.data!.getExhibit!.attributes).toEqual([{ name: canonical, value: '1987' }])

    const names = (
      await graphqlRequest(
        graphql(`
          query GetExhibitAttributesAfterMerge {
            getExhibitAttributes {
              name
            }
          }
        `),
      )
    ).data!.getExhibitAttributes.map((a) => a.name)
    expect(names).toContain(canonical)
    expect(names).not.toContain(duplicate)
  })

  graphqlTest('rename needs an admin and a name', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')
    const attribute = await createExhibitAttribute(graphqlRequest, `rename-${Date.now()}`, user)

    const asUser = await graphqlRequest(RENAME, { id: attribute.id, name: 'Neu' }, user)
    expect(asUser.errors![0].message).toBe('You must be an administrator to perform this operation')

    const empty = await graphqlRequest(RENAME, { id: attribute.id, name: '  ' }, admin)
    expect(empty.errors![0].message).toBe('Der Name darf nicht leer sein')
  })

  graphqlTest('an attribute on a data sheet cannot be deleted', async (graphqlRequest) => {
    const admin = await login('admin@example.com')
    const user = await login('daffy@example.com')
    const name = `used-${Date.now()}`
    await createExhibitWithAttributes(
      graphqlRequest,
      { title: 'Uses attribute', attributes: [{ name, value: 'x' }] },
      user,
    )
    const list = await graphqlRequest(
      graphql(`
        query GetExhibitAttributesForDelete {
          getExhibitAttributes {
            id
            name
          }
        }
      `),
    )
    const attribute = list.data!.getExhibitAttributes.find((a) => a.name === name)!

    const result = await graphqlRequest(
      graphql(`
        mutation DeleteUsedExhibitAttribute($id: Int!) {
          deleteExhibitAttribute(id: $id)
        }
      `),
      { id: attribute.id },
      admin,
    )
    expect(result.errors![0].message).toBe(
      `„${name}“ steht noch auf dem Datenblatt von 1 Exponat und kann nicht gelöscht werden`,
    )
  })
})
