import { Migration } from '@mikro-orm/migrations'

/*
 * The questions an exhibition puts to its exhibitors, and their answers. A
 * registration carries the answers given on the form until it is approved and
 * they become the exhibitor's.
 */
export class Migration20260906120000_survey extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create type "survey_question_type" as enum ('checkbox', 'singleChoice', 'multipleChoice', 'text', 'number');`,
    )
    this.addSql(`create table "survey_question" (
      "id" serial primary key,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      "exhibition_id" int not null,
      "key" varchar(255) not null,
      "ordering" int not null default 0,
      "label" varchar(255) not null,
      "description" text null,
      "type" "survey_question_type" not null,
      "options" jsonb not null,
      "required" boolean not null default false,
      "closes_at" timestamptz null,
      "on_registration_form" boolean not null default false,
      "show_if_question_id" int null,
      "show_if_values" jsonb not null
    );`)
    this.addSql(
      `alter table "survey_question" add constraint "survey_question_exhibition_id_key_unique" unique ("exhibition_id", "key");`,
    )
    this.addSql(
      `alter table "survey_question" add constraint "survey_question_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "survey_question" add constraint "survey_question_show_if_question_id_foreign" foreign key ("show_if_question_id") references "survey_question" ("id") on update cascade on delete set null;`,
    )

    this.addSql(`create table "survey_answer" (
      "id" serial primary key,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      "exhibitor_id" int not null,
      "question_id" int not null,
      "value" jsonb not null,
      "notified_at" timestamptz null
    );`)
    this.addSql(
      `alter table "survey_answer" add constraint "survey_answer_exhibitor_id_question_id_unique" unique ("exhibitor_id", "question_id");`,
    )
    this.addSql(
      `create index "survey_answer_notified_at_index" on "survey_answer" ("notified_at");`,
    )
    this.addSql(
      `alter table "survey_answer" add constraint "survey_answer_exhibitor_id_foreign" foreign key ("exhibitor_id") references "exhibitor" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "survey_answer" add constraint "survey_answer_question_id_foreign" foreign key ("question_id") references "survey_question" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(`alter table "registration" add column "survey_answers" jsonb null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "registration" drop column "survey_answers";`)
    this.addSql(`drop table if exists "survey_answer" cascade;`)
    this.addSql(`drop table if exists "survey_question" cascade;`)
    this.addSql(`drop type "survey_question_type";`)
  }
}
