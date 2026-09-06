import { Migration } from '@mikro-orm/migrations'

/*
 * The registration form used to carry a fixed set of checkboxes whose answers
 * sat in the registration's data blob: attendance days, Ethernet, the helper
 * roles. Those are survey questions now. For every exhibition whose
 * registrations answered them, the matching questions are created, the
 * answers are moved out of the blob onto the registration, and approved
 * registrations hand them to their exhibitor. The moved answers are stamped
 * as notified so the first digest does not report years of history.
 */

type Data = Record<string, unknown>
type Value = boolean | string[]

type Definition = {
  key: string
  label: string
  type: 'checkbox' | 'multipleChoice'
  options: { key: string; label: string }[]
  /* The blob keys this question takes over. */
  fields: string[]
  valueOf: (data: Data) => Value | undefined
}

const flag = (field: string) => (data: Data) =>
  typeof data[field] === 'boolean' ? (data[field] as boolean) : undefined

const DAYS = [
  { field: 'friday', key: 'freitag', label: 'Freitag (nur Aussteller und persönliche Gäste)' },
  { field: 'saturday', key: 'samstag', label: 'Samstag (Publikumstag)' },
  { field: 'sunday', key: 'sonntag', label: 'Sonntag (Publikumstag)' },
]

const DEFINITIONS: Definition[] = [
  {
    key: 'teilnahme',
    label: 'An welchen Tagen bist du dabei?',
    type: 'multipleChoice',
    options: DAYS.map(({ key, label }) => ({ key, label })),
    fields: DAYS.map((day) => day.field),
    valueOf: (data) => {
      if (!DAYS.some((day) => typeof data[day.field] === 'boolean')) return undefined
      const chosen = DAYS.filter((day) => data[day.field] === true).map((day) => day.key)
      return chosen.length ? chosen : undefined
    },
  },
  {
    key: 'ethernet',
    label: 'Für meine Ausstellung benötige ich einen Internet-Zugang über Ethernet',
    type: 'checkbox',
    options: [],
    fields: ['ethernet'],
    valueOf: flag('ethernet'),
  },
  {
    key: 'aufbau-donnerstag',
    label: 'Ich unterstütze beim Aufbau am Donnerstag',
    type: 'checkbox',
    options: [],
    fields: ['setupHelper'],
    valueOf: flag('setupHelper'),
  },
  {
    key: 'spiele-ecke',
    label: 'Ich unterstütze die Spiele-Ecke im Foyer mit eigener Hardware',
    type: 'checkbox',
    options: [],
    fields: ['gameCornerSupporter'],
    valueOf: flag('gameCornerSupporter'),
  },
  {
    key: 'essensangebote',
    label: 'Ich interessiere mich für Essensangebote in der Halle zwischen Freitag und Sonntag',
    type: 'checkbox',
    options: [],
    fields: ['dailyLunch'],
    valueOf: flag('dailyLunch'),
  },
  {
    key: 'abbau-sonntag',
    label: 'Ich unterstütze beim Abbau am Sonntag',
    type: 'checkbox',
    options: [],
    fields: ['helpOnSunday'],
    valueOf: flag('helpOnSunday'),
  },
]

const MIGRATED_FIELDS = DEFINITIONS.flatMap((definition) => definition.fields)

type RegistrationRow = {
  id: number
  exhibition_id: number
  status: string
  email: string
  nickname: string | null
  data: Data | null
  survey_answers: Record<string, unknown> | null
}

export class Migration20260906130000_survey_from_registration_data extends Migration {
  override async up(): Promise<void> {
    const knex = this.getKnex()
    const now = new Date()

    const registrations: RegistrationRow[] = await knex
      .select('id', 'exhibition_id', 'status', 'email', 'nickname', 'data', 'survey_answers')
      .from('registration')
      .orderBy('id')

    const byExhibition = new Map<number, RegistrationRow[]>()
    for (const registration of registrations) {
      const data = registration.data ?? {}
      if (!MIGRATED_FIELDS.some((field) => field in data)) continue
      const list = byExhibition.get(registration.exhibition_id) ?? []
      list.push(registration)
      byExhibition.set(registration.exhibition_id, list)
    }

    for (const [exhibitionId, theirs] of byExhibition) {
      /* Only what somebody in this exhibition actually answered becomes a question. */
      const wanted = DEFINITIONS.filter((definition) =>
        theirs.some((registration) =>
          definition.fields.some((field) => field in (registration.data ?? {})),
        ),
      )

      const [{ max }] = await knex('survey_question')
        .where({ exhibition_id: exhibitionId })
        .max('ordering as max')
      let ordering = max === null || max === undefined ? 0 : Number(max) + 1

      const questionIds = new Map<string, number>()
      for (const definition of wanted) {
        const existing = await knex('survey_question')
          .select('id')
          .where({ exhibition_id: exhibitionId, key: definition.key })
          .first()
        if (existing) {
          questionIds.set(definition.key, existing.id)
          continue
        }
        const [inserted] = await knex('survey_question')
          .insert({
            created_at: now,
            exhibition_id: exhibitionId,
            key: definition.key,
            ordering: ordering++,
            label: definition.label,
            type: definition.type,
            options: JSON.stringify(definition.options),
            required: false,
            on_registration_form: true,
            show_if_values: JSON.stringify([]),
          })
          .returning('id')
        questionIds.set(definition.key, inserted.id)
      }

      for (const registration of theirs) {
        const data = { ...(registration.data ?? {}) }
        const answers: Record<string, Value> = {
          ...((registration.survey_answers ?? {}) as Record<string, Value>),
        }
        for (const definition of wanted) {
          const value = definition.valueOf(data)
          if (value !== undefined) answers[String(questionIds.get(definition.key))] = value
          for (const field of definition.fields) delete data[field]
        }
        await knex('registration')
          .where({ id: registration.id })
          .update({ data: JSON.stringify(data), survey_answers: JSON.stringify(answers) })

        if (registration.status !== 'approved') continue
        const exhibitor = await this.exhibitorOf(exhibitionId, registration)
        if (!exhibitor) continue
        for (const [questionId, value] of Object.entries(answers)) {
          await knex('survey_answer')
            .insert({
              created_at: now,
              exhibitor_id: exhibitor,
              question_id: Number(questionId),
              value: JSON.stringify(value),
              notified_at: now,
            })
            .onConflict(['exhibitor_id', 'question_id'])
            .ignore()
        }
      }
    }
  }

  /* The exhibitor a registration was approved into: by address, or by the
     forum name when the address has changed since, the way approval looks. */
  private async exhibitorOf(exhibitionId: number, registration: RegistrationRow) {
    const knex = this.getKnex()
    let user = await knex('user').select('id').whereRaw('email = ?', [registration.email]).first()
    if (!user && registration.nickname) {
      user = await knex('user').select('id').where({ nickname: registration.nickname }).first()
    }
    if (!user) return undefined
    const exhibitor = await knex('exhibitor')
      .select('id')
      .where({ exhibition_id: exhibitionId, user_id: user.id })
      .first()
    return exhibitor?.id as number | undefined
  }

  /*
   * Puts the answers back into the blobs and removes the questions this
   * migration made, with every answer to them.
   */
  override async down(): Promise<void> {
    const knex = this.getKnex()
    const questions: { id: number; key: string }[] = await knex('survey_question')
      .select('id', 'key')
      .whereIn(
        'key',
        DEFINITIONS.map((definition) => definition.key),
      )
    const definitionOf = new Map(
      questions.map((question) => [
        question.id,
        DEFINITIONS.find((definition) => definition.key === question.key)!,
      ]),
    )

    const registrations: RegistrationRow[] = await knex
      .select('id', 'exhibition_id', 'status', 'email', 'nickname', 'data', 'survey_answers')
      .from('registration')
      .whereNotNull('survey_answers')
    for (const registration of registrations) {
      const data = { ...(registration.data ?? {}) }
      const answers = { ...(registration.survey_answers ?? {}) }
      for (const [questionId, value] of Object.entries(answers)) {
        const definition = definitionOf.get(Number(questionId))
        if (!definition) continue
        if (definition.type === 'multipleChoice') {
          for (const day of DAYS) data[day.field] = (value as string[]).includes(day.key)
        } else {
          data[definition.fields[0]] = value
        }
        delete answers[questionId]
      }
      await knex('registration')
        .where({ id: registration.id })
        .update({ data: JSON.stringify(data), survey_answers: JSON.stringify(answers) })
    }

    await knex('survey_question')
      .whereIn(
        'id',
        questions.map((question) => question.id),
      )
      .delete()
  }
}
