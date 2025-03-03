import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/user.entity.js'
import { Table } from '../modules/table/table.entity.js'
import { Exhibit } from '../modules/exhibit/exhibit.entity.js'
import { Exhibition } from '../modules/exhibition/exhibition.entity.js'
import { Exhibitor } from '../modules/exhibitor/exhibitor.entity.js'

export class DemoSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const tables = []
    const exhibition = em.create(Exhibition, {
      key: 'cc2025',
      title: 'Classic Computing 2025',
      hostMatch: 'localhost|2025\\.classic-computing\\.de',
    })

    for (let number = 1; number <= 10; number++) {
      const table = em.create(Table, { exhibition, id: number, number })
      tables.push(table)
    }

    const users = [
      em.create(User, {
        fullName: 'Hans Hübner',
        email: 'hans.huebner@gmail.com',
        nickname: 'hans',
        password: 'geheim',
        contacts: {
          mastodon: '@hanshuebner@mastodon.social',
        },
      }),
      em.create(User, {
        fullName: 'Volker',
        email: 'volker@example.com',
        nickname: 'gnupublic',
        password: 'geheim',
        contacts: {},
      }),
      em.create(User, {
        fullName: 'Konstantin',
        email: 'konstantin@example.com',
        nickname: 'konnexus',
        password: 'geheim',
        contacts: {},
      }),
    ]

    const exhibitors = users.map((user) =>
      em.create(Exhibitor, { user, exhibition }),
    )

    const exhibits = [
      em.create(Exhibit, {
        exhibition,
        title: 'Bildschirmtext',
        text: 'Bildschirmtext war ein interaktives Textsystem, das in den 1990er Jahren in Deutschland weit verbreitet war.',
        table: tables[0],
        exhibitor: exhibitors[0],
      }),
      em.create(Exhibit, {
        exhibition,
        title: 'TELEBAHN',
        text: 'TELEBAHN ist ein X.25-Netzwerk.',
        exhibitor: exhibitors[0],
      }),
      em.create(Exhibit, {
        exhibition,
        title: 'GIGI',
        text: 'Der GIGI ist ein Grafikterminal, welches auch ein eingebautes Microsoft BASIC besitzt.',
        table: tables[1],
        exhibitor: exhibitors[0],
      }),
      em.create(Exhibit, {
        exhibition,
        title: 'PDP-8',
        text: `Der [PDP-8](https://de.wikipedia.org/wiki/PDP-8) (bei Anwendern meist 'die PDP-8') war ein 12-Bit
         Minirechner aus der Reihe Programmed Data Processor von Digital 
         Equipment Corporation (DEC). Es war der erste kommerziell erfolgreiche 
         Minicomputer mit weit über 50.000 verkauften Exemplaren, Schätzungen
         gehen sogar von bis zu 300.000 Exemplaren aus bei Berücksichtigung 
         von kompatiblen Nachbauten.

![image](https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Digital_pdp8-e2.jpg/2880px-Digital_pdp8-e2.jpg)
        `,
        exhibitor: exhibitors[1],
      }),
      em.create(Exhibit, {
        exhibition,
        title: 'Patcher',
        text: 'Der Patcher ist ein **Retro-Universal-Laptop** auf Raspberry-Pi-Basis.',
        table: tables[2],
        exhibitor: exhibitors[2],
      }),
      em.create(Exhibit, {
        exhibition,
        title: 'Macintosh SE/30',
        text: 'Der Macintosh SE/30 war ein Computer der Firma Apple.',
        table: tables[3],
        exhibitor: exhibitors[2],
      }),
    ]

    exhibitors[0].exhibits.add(exhibits[0], exhibits[1], exhibits[2])
    exhibitors[1].exhibits.add(exhibits[3])
    exhibitors[2].exhibits.add(exhibits[4], exhibits[5])

    // Set the exhibitor for each table
    tables[0].exhibitor = exhibitors[0]
    tables[1].exhibitor = exhibitors[0]
    tables[2].exhibitor = exhibitors[2]
    tables[3].exhibitor = exhibitors[2]
    tables[4].exhibitor = exhibitors[1]
    tables[5].exhibitor = exhibitors[1]

    await em.persistAndFlush([...tables, ...users, ...exhibits])
  }
}
