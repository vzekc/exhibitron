import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/user.entity.js'
import { Table } from '../modules/table/table.entity.js'
import { Exhibit } from '../modules/exhibit/exhibit.entity.js'

export class DemoSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const tables = []
    for (let id = 1; id <= 10; id++) {
      const table = em.create(Table, { id })
      tables.push(table)
    }

    const users = [
      em.create(User, {
        fullName: 'Hans Hübner',
        username: 'hans',
        password: 'geheim',
        contacts: {
          mastodon: '@hanshuebner@mastodon.social',
          email: 'hans.huebner@gmail.com',
        },
      }),
      em.create(User, {
        fullName: 'Volker',
        username: 'gnupublic',
        password: 'geheim',
        contacts: {},
      }),
      em.create(User, {
        fullName: 'Konstantin',
        username: 'konnexus',
        password: 'geheim',
        contacts: {},
      }),
    ]

    const exhibits = [
      em.create(Exhibit, {
        title: 'Bildschirmtext',
        table: tables[0],
        exhibitor: users[0],
      }),
      em.create(Exhibit, {
        title: 'TELEBAHN',
        exhibitor: users[0],
      }),
      em.create(Exhibit, {
        title: 'GIGI',
        table: tables[1],
        exhibitor: users[0],
      }),
      em.create(Exhibit, {
        title: 'PDP-8',
        text: `Der PDP-8 (bei Anwendern meist 'die PDP-8') war ein 12-Bit
         Minirechner aus der Reihe Programmed Data Processor von Digital 
         Equipment Corporation (DEC). Es war der erste kommerziell erfolgreiche 
         Minicomputer mit weit über 50.000 verkauften Exemplaren, Schätzungen
         gehen sogar von bis zu 300.000 Exemplaren aus bei Berücksichtigung 
         von kompatiblen Nachbauten.

        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Digital_pdp8-e2.jpg/2880px-Digital_pdp8-e2.jpg"/>
        `,
        exhibitor: users[1],
      }),
      em.create(Exhibit, {
        title: 'Patcher',
        table: tables[2],
        exhibitor: users[2],
      }),
      em.create(Exhibit, {
        title: 'Macintosh SE/30',
        table: tables[3],
        exhibitor: users[2],
      }),
    ]

    users[0].exhibits.add(exhibits[0], exhibits[1], exhibits[2])
    users[1].exhibits.add(exhibits[3])
    users[2].exhibits.add(exhibits[4], exhibits[5])

    // Set the exhibitor for each table
    tables[0].exhibitor = users[0]
    tables[1].exhibitor = users[0]
    tables[2].exhibitor = users[2]
    tables[3].exhibitor = users[2]
    tables[4].exhibitor = users[1]
    tables[5].exhibitor = users[1]

    await em.persistAndFlush([...tables, ...users, ...exhibits])
  }
}
