import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/user.entity.js'
import { Table } from '../modules/table/table.entity.js'
import { Exhibition } from '../modules/exhibition/exhibition.entity.js'
import { Exhibitor } from '../modules/exhibitor/exhibitor.entity.js'
import { Exhibit } from '../modules/exhibit/exhibit.entity.js'
import { Page } from '../modules/page/page.entity.js'

export class TestSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const exhibition = em.create(Exhibition, {
      key: 'cc2025',
      title: 'Classic Computing 2025',
      hostMatch: 'localhost|2025\\.classic-computing\\.de',
    })

    em.create(Page, {
      key: 'home',
      exhibition,
      title: 'Home',
      text: 'Welcome to the Classic Computing 2025 exhibition!',
    })

    em.create(Page, {
      key: 'schedule',
      exhibition,
      title: 'Schedule',
      text: 'The schedule for the exhibition will be available soon.',
    })

    em.create(User, {
      id: 1001,
      fullName: 'Harald Eder',
      email: 'meistereder@example.com',
      nickname: 'MeisterEder',
      password: 'password123',
      contacts: {},
    })

    for (let number = 1; number <= 10; number++) {
      em.create(Table, { exhibition, id: number, number })
    }

    ;[
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
    ].forEach(({ exhibits, ...userProps }) => {
      const user = em.create(User, {
        ...userProps,
        email: `${userProps.nickname}@example.com`,
        password: 'geheim',
        contacts: {},
      })
      const exhibitor = em.create(Exhibitor, {
        exhibition,
        user,
      })
      exhibits?.forEach((props) => em.create(Exhibit, { ...props, exhibitor, exhibition }))
    })
  }
}
