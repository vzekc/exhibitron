import { EntityManager, RequiredEntityData } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/entity.js'
import { Table } from '../modules/table/entity.js'
import { Exhibit } from '../modules/exhibit/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'
import { Document } from '../modules/document/entity.js'
import { Page } from '../modules/page/entity.js'

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
      await (async () => {
        const user = em.create(User, {
          fullName: 'Hans Hübner',
          email: 'hans.huebner@gmail.com',
          nickname: 'hans',
          contacts: {
            mastodon: '@hanshuebner@mastodon.social',
          },
        })
        await em.getRepository(User).setPassword(user, 'geheim')
        return user
      })(),
      await (async () => {
        const user = em.create(User, {
          fullName: 'Volker',
          email: 'volker@example.com',
          nickname: 'gnupublic',
          contacts: {},
        })
        await em.getRepository(User).setPassword(user, 'geheim')
        return user
      })(),
      await (async () => {
        const user = em.create(User, {
          fullName: 'Konstantin',
          email: 'konstantin@example.com',
          nickname: 'konnexus',
          contacts: {},
        })
        await em.getRepository(User).setPassword(user, 'geheim')
        return user
      })(),
    ]

    const exhibitors = users.map((user) => em.create(Exhibitor, { user, exhibition }))

    // Create a Documents repository to process HTML content
    const documentRepository = em.getRepository(Document)

    // Create home page with Document entity
    const homePage = em.create(Page, {
      key: 'home',
      exhibition,
      title: 'Demo Home Page',
      content: await documentRepository.ensureDocument(
        null,
        '<h1>Welcome to the Classic Computing 2025 Exhibition</h1><p>This is a demo of our exhibition platform.</p>',
      ),
    })

    const exhibitData = [
      {
        id: 1,
        exhibition,
        title: 'Bildschirmtext',
        html: 'Bildschirmtext war ein interaktives Textsystem, das in den 1990er Jahren in Deutschland weit verbreitet war.',
        table: tables[0],
        exhibitor: exhibitors[0],
      },
      {
        id: 2,
        exhibition,
        title: 'TELEBAHN',
        html: 'TELEBAHN ist ein X.25-Netzwerk.',
        extendedHtml:
          'TELEBAHN ist die erweiterte Version des deutschen X.25-Netzwerks, das in den 1980er Jahren eingeführt wurde.',
        exhibitor: exhibitors[0],
      },
      {
        id: 3,
        exhibition,
        title: 'GIGI',
        html: 'Der GIGI ist ein Grafikterminal, welches auch ein eingebautes Microsoft BASIC besitzt.',
        table: tables[1],
        exhibitor: exhibitors[0],
      },
      {
        id: 4,
        exhibition,
        title: 'PDP-8',
        html: `Der [PDP-8](https://de.wikipedia.org/wiki/PDP-8) (bei Anwendern meist 'die PDP-8') war ein 12-Bit
         Minirechner aus der Reihe Programmed Data Processor von Digital 
         Equipment Corporation (DEC). Es war der erste kommerziell erfolgreiche 
         Minicomputer mit weit über 50.000 verkauften Exemplaren, Schätzungen
         gehen sogar von bis zu 300.000 Exemplaren aus bei Berücksichtigung 
         von kompatiblen Nachbauten.`,
        extendedHtml: `
![image](https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Digital_pdp8-e2.jpg/2880px-Digital_pdp8-e2.jpg)

## Technische Daten
- 12-Bit-Architektur
- Taktfrequenz: 1,5 MHz
- Arbeitsspeicher: 4 KB, erweiterbar auf 32 KB
- Gewicht: ca. 12,5 kg
`,
        exhibitor: exhibitors[1],
      },
      {
        id: 5,
        exhibition,
        title: 'Patcher',
        html: 'Der Patcher ist ein **Retro-Universal-Laptop** auf Raspberry-Pi-Basis.',
        table: tables[2],
        exhibitor: exhibitors[2],
      },
      {
        id: 6,
        exhibition,
        title: 'Macintosh SE/30',
        html: 'Der Macintosh SE/30 war ein Computer der Firma Apple.',
        extendedHtml:
          'Der Macintosh SE/30 wurde 1989 eingeführt und gilt bis heute als einer der besten klassischen Macintosh-Computer. Er verfügt über einen Motorola 68030 Prozessor mit 16 MHz und kann bis zu 128 MB RAM aufnehmen.',
        table: tables[3],
        exhibitor: exhibitors[2],
      },
    ]

    const exhibits = await Promise.all(
      exhibitData.map(async ({ html, extendedHtml, ...exhibitProps }) => {
        const exhibitObj: RequiredEntityData<Exhibit> = {
          ...exhibitProps,
          description: await documentRepository.ensureDocument(null, html),
        }

        // Add description extension if provided
        if (extendedHtml) {
          exhibitObj.descriptionExtension = await documentRepository.ensureDocument(
            null,
            extendedHtml,
          )
        }

        return em.create(Exhibit, exhibitObj)
      }),
    )

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

    await em.persistAndFlush([...tables, ...users, ...exhibits, homePage])
  }
}
