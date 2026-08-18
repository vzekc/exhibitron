import { Context } from '../../app/context.js'
import { User } from '../user/entity.js'
import { isForumNickname } from './forum.js'

export type RegisterOutcome = 'verificationSent' | 'useForumLogin' | 'useLogin'

export interface VolunteerIdentity {
  outcome: RegisterOutcome
  message: string
  user?: User
}

/*
 * Who is signing up, for somebody who is not logged in.
 *
 * A name that belongs to the forum, and an address that already has an
 * account, both lead to the login rather than to a second identity — the
 * shifts of one person belong together, and a returning exhibitor should find
 * theirs where they left them.
 *
 * What comes back from here is either an account to hang the booking on, or
 * the sentence to put in front of the visitor.
 */
export const identifyVolunteer = async (
  context: Context,
  { name, email, password }: { name: string; email: string; password: string },
): Promise<VolunteerIdentity> => {
  const { db, exhibition } = context

  const existing = await db.user.findOne({ email }, { populate: ['password'] })
  if (existing) {
    if (existing.nickname) {
      return {
        outcome: 'useForumLogin',
        message: 'Zu dieser Adresse gibt es schon ein Konto. Bitte melde dich über das Forum an.',
      }
    }
    if (existing.password) {
      return {
        outcome: 'useLogin',
        message: 'Zu dieser Adresse gibt es schon ein Konto. Bitte melde dich an.',
      }
    }
    /* A volunteer who never clicked the link in their mail. They get a new
     * one — the old may have expired — and the password they have just
     * chosen, since the one from the first attempt was never used. */
    existing.fullName = name
    await db.user.setPassword(existing, password)
    db.user.createPasswordResetToken(existing, exhibition.endDate.getTime())
    return { outcome: 'verificationSent', message: verificationSent(email), user: existing }
  }

  const nameTaken = await db.user.findOne({ $or: [{ nickname: name }, { fullName: name }] })
  if (nameTaken || (await isForumNickname(name))) {
    return {
      outcome: 'useForumLogin',
      message: `„${name}“ gehört zu einem Konto im Forum. Bitte melde dich über das Forum an.`,
    }
  }

  const user = db.user.create({ email, fullName: name, isAdministrator: false })
  db.em.persist(user)
  await db.user.setPassword(user, password)

  /* The token is the link in the mail: it shows that the address belongs to
   * this person, and it is what the forum association reads. It lasts as long
   * as the exhibition it was made for. Afterwards they log in like anybody
   * else, with the address and the password they chose. */
  db.user.createPasswordResetToken(user, exhibition.endDate.getTime())

  return { outcome: 'verificationSent', message: verificationSent(email), user }
}

const verificationSent = (email: string) =>
  `Wir haben eine E-Mail an ${email} geschickt. Bitte bestätige darin deine Anmeldung.`

/* An account that came from the forum is signed into over there. */
export const belongsToTheForum = (user: User) => !!user.nickname
