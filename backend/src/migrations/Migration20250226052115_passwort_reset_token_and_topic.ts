import { Migration } from '@mikro-orm/migrations'

export class Migration20250226052115_passwort_reset_token_and_topic extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "registration" add column "topic" varchar(255);`)
    this.addSql(`update "registration" set "topic" = data->>'topic';`)
    this.addSql(`alter table "registration" alter column "topic" set not null;`)

    this.addSql(
      `alter table "user" add column "password_reset_token" varchar(255) null, add column "pasword_reset_token_expires" timestamptz null;`,
    )
    this.addSql(
      `create index "user_password_reset_token_index" on "user" ("password_reset_token");`,
    )
    this.addSql(
      `alter table "user" add constraint "user_password_reset_token_unique" unique ("password_reset_token");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "registration" drop column "topic";`)

    this.addSql(`drop index "user_password_reset_token_index";`)
    this.addSql(
      `alter table "user" drop constraint "user_password_reset_token_unique";`,
    )
    this.addSql(
      `alter table "user" drop column "password_reset_token", drop column "pasword_reset_token_expires";`,
    )
  }
}
