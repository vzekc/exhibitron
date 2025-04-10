import { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/entity.js'
import { Table } from '../modules/table/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'
import { Exhibit } from '../modules/exhibit/entity.js'
import { Page } from '../modules/page/entity.js'
import { Document } from '../modules/document/entity.js'
import { Room } from '../modules/room/entity.js'
import { ConferenceSession } from '../modules/conferenceSession/entity.js'
import { Host } from '../modules/host/entity.js'

export class TestSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const exhibition = em.create(Exhibition, {
      key: 'cc2025',
      title: 'Classic Computing 2025',
      hostMatch: 'localhost|2025\\.classic-computing\\.de',
      startDate: '2025-09-11',
      endDate: '2025-09-14',
    })

    const rooms = [{ name: 'Main Hall' }, { name: 'Workshop Room' }, { name: 'Lecture Hall' }]

    for (const room of rooms) {
      em.create(Room, {
        ...room,
        exhibition,
      })
    }

    const documentRepository = em.getRepository(Document)

    em.create(Page, {
      key: 'home',
      exhibition,
      title: 'Home',
      content: await documentRepository.ensureDocument(
        null,
        'Welcome to the Classic Computing 2025 exhibition!',
        em,
      ),
    })

    em.create(Page, {
      key: 'schedule',
      exhibition,
      title: 'Schedule',
      content: await documentRepository.ensureDocument(
        null,
        'The schedule for the exhibition will be available soon.',
        em,
      ),
    })

    const user = em.create(User, {
      id: 1001,
      fullName: 'Harald Eder',
      email: 'meistereder@example.com',
      nickname: 'MeisterEder',
      contacts: {},
    })
    await em.getRepository(User).setPassword(user, 'password123')

    for (let number = 1; number <= 10; number++) {
      em.create(Table, { exhibition, id: number, number })
    }

    await Promise.all(
      [
        {
          id: 1002,
          fullName: 'Daffy Duck',
          nickname: 'daffy',
          exhibits: [
            { id: 1001, title: 'The first Macintosh' },
            { id: 1002, title: 'Old DEC systems' },
          ],
        },
        {
          id: 1003,
          fullName: 'Donald Duck',
          nickname: 'donald',
          exhibits: [
            { id: 1003, title: 'IBM Mainframes' },
            { id: 1004, title: 'HP calculators' },
          ],
        },
        {
          id: 1004,
          nickname: 'admin',
          isAdministrator: true,
        },
      ].map(async ({ exhibits, ...userProps }) => {
        const user = em.create(User, {
          ...userProps,
          email: `${userProps.nickname}@example.com`,
          contacts: {},
        })
        await em.getRepository(User).setPassword(user, 'geheim')
        const exhibitor = em.create(Exhibitor, {
          exhibition,
          user,
        })
        exhibits?.forEach((props) => em.create(Exhibit, { ...props, exhibitor, exhibition }))
      }),
    )

    const conferenceSessions = [
      {
        title: 'The Evolution of Classic Computers',
        startTime: new Date('2025-09-11T10:00:00'),
        endTime: new Date('2025-09-11T11:00:00'),
        room: await em.getRepository(Room).findOneOrFail({ name: 'Main Hall' }),
      },
      {
        title: 'Hands-on Workshop: Building a Retro Computer',
        startTime: new Date('2025-09-12T14:00:00'),
        endTime: new Date('2025-09-12T16:00:00'),
        room: await em.getRepository(Room).findOneOrFail({ name: 'Workshop Room' }),
      },
    ]

    for (const conferenceSession of conferenceSessions) {
      em.create(ConferenceSession, {
        ...conferenceSession,
        exhibition,
        exhibitors: [
          await em.getRepository(Exhibitor).findOneOrFail({ user: { nickname: 'daffy' } }),
        ],
      })
    }

    // Create hosts for testing
    const daffyExhibitor = await em
      .getRepository(Exhibitor)
      .findOneOrFail({ user: { nickname: 'daffy' } })
    const daffyExhibit = await em.getRepository(Exhibit).findOneOrFail({ id: 1001 })

    em.create(Host, {
      name: 'test-host',
      ipAddress: '192.168.1.1',
      exhibitor: daffyExhibitor,
      exhibit: daffyExhibit,
      exhibition,
    })
  }
}
