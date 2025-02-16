import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { User } from '../modules/user/user.entity.js'
import { Table } from '../modules/exhibition/table.entity.js'

export class TestSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(User, {
      fullName: 'Foo Bar',
      email: 'foo@bar.com',
      password: 'password123',
    })

    for (let number = 1; number <= 10; number++) {
      em.create(Table, { id: number + 1000, number })
    }

    ;[
      {
        fullName: 'Daffy Duck',
        email: 'daffy@duck.com',
        exhibitions: [
          { id: 1001, title: 'The first Macintosh' },
          { id: 1002, title: 'Old DEC systems' },
        ],
      },
      {
        fullName: 'Donald Duck',
        email: 'donald@duck.com',
        exhibitions: [
          { id: 1003, title: 'IBM Mainframes' },
          { id: 1004, title: 'HP calculators' },
        ],
      },
    ].forEach((user) => em.create(User, { ...user, password: 'secret' }))
  }
}
