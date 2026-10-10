import { expect } from 'vitest'
import { graphql } from 'gql.tada'
import { ExecuteOperationFunction, graphqlTest } from '../../test/server.js'
import { initORM } from '../../db.js'
import { VisitorPhoto } from '../visitorPhoto/entity.js'
import { hashCode } from '../visitorPhoto/storage.js'
import { Document } from '../document/entity.js'

const search = async (execute: ExecuteOperationFunction, query: string) => {
  const result = await execute(
    graphql(`
      query Search($query: String!) {
        search(query: $query) {
          target
          exhibits {
            title
          }
          exhibitors {
            user {
              nickname
            }
          }
          conferenceSessions {
            title
          }
        }
      }
    `),
    { query },
  )
  expect(result.errors).toBeUndefined()
  return result.data!.search
}

graphqlTest('a photo id leads to its photo, whatever the case', async (execute) => {
  const db = await initORM()
  const exhibition = await db.exhibition.findOneOrFail({ title: 'Classic Computing 2025' })
  db.em.create(VisitorPhoto, {
    id: 'SUCH42',
    exhibition,
    codeHash: hashCode('PQ4M7XKD'),
  })
  await db.em.flush()

  expect((await search(execute, 'such42')).target).toBe('/foto/SUCH42')
})

graphqlTest('a word shaped like a photo id is searched for as text', async (execute) => {
  const result = await search(execute, 'calcul')
  expect(result.target).toBeNull()
  expect(result.exhibits.map(({ title }) => title)).toEqual(['HP calculators'])
})

graphqlTest('a table number leads to the table', async (execute) => {
  expect((await search(execute, ' 3 ')).target).toBe('/table/3')
  expect((await search(execute, '99')).target).toBeNull()
})

graphqlTest('a nickname leads to the exhibitor', async (execute) => {
  const result = await search(execute, 'DAFFY')
  expect(result.target).toMatch(/^\/exhibitor\/\d+$/)
})

graphqlTest('anything else lists what contains it', async (execute) => {
  const result = await search(execute, 'computer')
  expect(result.target).toBeNull()
  expect(result.conferenceSessions.map(({ title }) => title).sort()).toEqual([
    'Hands-on Workshop: Building a Retro Computer',
    'The Evolution of Classic Computers',
  ])

  const partial = await search(execute, 'duck')
  expect(partial.exhibitors.map(({ user }) => user.nickname).sort()).toEqual(['daffy', 'donald'])
})

graphqlTest('a wildcard is taken literally', async (execute) => {
  const result = await search(execute, '%%')
  expect(result.exhibits).toEqual([])
  expect(result.exhibitors).toEqual([])
})

graphqlTest('a description is searched as text, not as markup', async (execute) => {
  const db = await initORM()
  const exhibit = await db.exhibit.findOneOrFail({ title: 'Old DEC systems' })
  exhibit.description = db.em.create(Document, { html: '<p>Eine <strong>PDP-11/34</strong></p>' })
  await db.em.flush()

  expect((await search(execute, 'pdp-11')).exhibits.map(({ title }) => title)).toEqual([
    'Old DEC systems',
  ])
  expect((await search(execute, 'strong')).exhibits).toEqual([])
})
