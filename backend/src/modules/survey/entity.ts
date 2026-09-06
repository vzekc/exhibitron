import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { SurveyQuestionType } from '../../generated/graphql.js'

export type SurveyOptionRow = { key: string; label: string }

/*
 * What one answer looks like in the database, by the question's type: a
 * boolean for a checkbox, an option key for a single choice, option keys for a
 * multiple choice, a string for text, a number for a number.
 */
export type SurveyAnswerValue = boolean | string | number | string[]

/*
 * Something the organisation asks every exhibitor of an exhibition. The option
 * keys are fixed when an option is made, so that a label reworded later still
 * points at the answers already given. `showIfQuestion` hides the question
 * until its parent's answer is one of `showIfValues`; a parent is never itself
 * dependent.
 */
@Entity()
@Unique({ properties: ['exhibition', 'key'] })
export class SurveyQuestion extends BaseEntity<
  'ordering' | 'options' | 'required' | 'onRegistrationForm' | 'showIfValues'
> {
  @ManyToOne(() => Exhibition, { deleteRule: 'cascade' })
  exhibition!: Exhibition

  @Property()
  key!: string

  @Property()
  ordering: number = 0

  @Property()
  label!: string

  @Property({ columnType: 'text', nullable: true })
  description?: string

  @Enum({ items: () => SurveyQuestionType, nativeEnumName: 'survey_question_type' })
  type!: SurveyQuestionType

  @Property({ type: 'json' })
  options: SurveyOptionRow[] = []

  @Property()
  required: boolean = false

  @Property({ nullable: true })
  closesAt?: Date

  @Property()
  onRegistrationForm: boolean = false

  @ManyToOne(() => SurveyQuestion, { nullable: true, deleteRule: 'set null' })
  showIfQuestion?: SurveyQuestion

  @Property({ type: 'json' })
  showIfValues: string[] = []
}

/*
 * One exhibitor's answer to one question. `notifiedAt` is cleared whenever the
 * value changes, and the daily digest to the admins stamps it again, so a
 * change is told once.
 */
@Entity()
@Unique({ properties: ['exhibitor', 'question'] })
export class SurveyAnswer extends BaseEntity {
  @ManyToOne(() => Exhibitor, { deleteRule: 'cascade' })
  exhibitor!: Exhibitor

  @ManyToOne(() => SurveyQuestion, { deleteRule: 'cascade' })
  question!: SurveyQuestion

  @Property({ type: 'json' })
  value!: SurveyAnswerValue

  @Index()
  @Property({ nullable: true })
  notifiedAt?: Date
}
