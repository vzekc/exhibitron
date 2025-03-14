import { Migration } from '@mikro-orm/migrations'

export class Migration20250224045421 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "user" add column "email" varchar(255) null;`)
    // Populate email column from contacts.email
    this.addSql(
      `update "user" set "email" = coalesce("contacts"->>'email', "username" || '@example.com');`,
    )

    this.addSql(`drop index "user_username_index";`)
    this.addSql(`alter table "user" drop constraint "user_username_unique";`)

    this.addSql(`alter table "user" rename column "username" to "nickname";`)
    this.addSql(`create index "user_email_index" on "user" ("email");`)
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`)
    this.addSql(`create index "user_nickname_index" on "user" ("nickname");`)
    this.addSql(`alter table "user" add constraint "user_nickname_unique" unique ("nickname");`)

    // Remove email from contacts
    this.addSql(`update "user" set "contacts" = "contacts" - 'email';`)

    // Add not null constraint to email
    this.addSql(`alter table "user" alter column "email" set not null;`)

    // Drop not null constraint from nickname
    this.addSql(`alter table "user" alter column "nickname" drop not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "user_email_index";`)
    this.addSql(`alter table "user" drop constraint "user_email_unique";`)
    this.addSql(`drop index "user_nickname_index";`)
    this.addSql(`alter table "user" drop constraint "user_nickname_unique";`)
    this.addSql(`alter table "user" drop column "nickname";`)

    this.addSql(`alter table "user" rename column "email" to "username";`)
    this.addSql(`create index "user_username_index" on "user" ("username");`)
    this.addSql(`alter table "user" add constraint "user_username_unique" unique ("username");`)
  }
}
