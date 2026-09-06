import { Migration } from '@mikro-orm/migrations'

/*
 * Who hears about changed answers beyond the exhibition's admins: a person
 * subscribed to one question, to an audience, or to everything.
 */
export class Migration20260906190000_survey_subscription extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "survey_subscription" (
      "id" serial primary key,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      "user_id" int not null,
      "exhibition_id" int not null,
      "question_id" int null,
      "audience" "survey_audience" null
    );`)
    this.addSql(
      `alter table "survey_subscription" add constraint "survey_subscription_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "survey_subscription" add constraint "survey_subscription_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "survey_subscription" add constraint "survey_subscription_question_id_foreign" foreign key ("question_id") references "survey_question" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "survey_subscription" cascade;`)
  }
}
