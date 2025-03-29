import { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/entity.js'
import { Table } from '../modules/table/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'
import { Exhibit } from '../modules/exhibit/entity.js'
import { Page } from '../modules/page/entity.js'
import { Document } from '../modules/document/entity.js'

export class TestSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const exhibition = em.create(Exhibition, {
      key: 'cc2025',
      title: 'Classic Computing 2025',
      hostMatch: 'localhost|2025\\.classic-computing\\.de',
    })

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
  }
}
