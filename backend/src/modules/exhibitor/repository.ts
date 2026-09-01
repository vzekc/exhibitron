import { EntityRepository } from '@mikro-orm/postgresql'
import { Exhibitor } from './entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Table } from '../table/entity.js'
import { TableRepository } from '../table/repository.js'
import { Host } from '../host/entity.js'
import { SerialToken } from '../serial/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { Registration } from '../registration/entity.js'
import { VolunteerBooking } from '../volunteer/entity.js'
import { ProfileImage, User } from '../user/entity.js'

export class ExhibitorRepository extends EntityRepository<Exhibitor> {
  /*
   * Removes an exhibitor who cancels their participation. Their exhibits,
   * hostnames, serial tokens and talks nobody else gives go with them, their
   * tables are released with the change recorded, and their registration is
   * deleted so the address can register again. The user account is deleted
   * too, unless something else still hangs on it — a participation in another
   * exhibition, volunteer shifts, or administrator rights.
   *
   * `keepRegistration` is for rejecting an already approved registration: the
   * participation goes, the registration stays on file as the record of the
   * rejection.
   */
  async cancelParticipation(
    exhibitor: Exhibitor,
    actor: User,
    { keepRegistration = false }: { keepRegistration?: boolean } = {},
  ) {
    const em = this.em
    await em.populate(exhibitor, ['user', 'exhibition'])
    const { user, exhibition } = exhibitor

    const tableRepository = em.getRepository(Table) as TableRepository
    const tables = await em.find(Table, { exhibitor })
    for (const table of tables) {
      await tableRepository.release(exhibition, table.number, exhibitor, actor)
    }

    const exhibits = await em.find(
      Exhibit,
      { exhibitor },
      { populate: ['mainImage', 'description', 'descriptionExtension'] },
    )
    exhibits.forEach((exhibit) => em.remove(exhibit))

    const hosts = await em.find(Host, { exhibitor })
    hosts.forEach((host) => em.remove(host))

    const conferenceSessions = await em.find(
      ConferenceSession,
      { exhibitors: exhibitor },
      { populate: ['exhibitors'] },
    )
    for (const conferenceSession of conferenceSessions) {
      conferenceSession.exhibitors.remove(exhibitor)
      if (conferenceSession.exhibitors.length === 0) {
        em.remove(conferenceSession)
      }
    }

    await em.nativeDelete(SerialToken, { exhibitor })

    if (!keepRegistration) {
      await em.nativeDelete(Registration, {
        exhibition,
        $or: [{ email: user.email }, ...(user.nickname ? [{ nickname: user.nickname }] : [])],
      })
    }

    em.remove(exhibitor)

    await em.populate(user, ['adminExhibitions'])
    const accountStillNeeded =
      user.isAdministrator ||
      user.adminExhibitions.length > 0 ||
      (await em.count(Exhibitor, { user, id: { $ne: exhibitor.id } })) > 0 ||
      (await em.count(VolunteerBooking, { user })) > 0
    if (!accountStillNeeded) {
      const profileImage = await em.findOne(ProfileImage, { user })
      if (profileImage) {
        em.remove(profileImage)
      }
      em.remove(user)
    }

    await em.flush()
  }
}
