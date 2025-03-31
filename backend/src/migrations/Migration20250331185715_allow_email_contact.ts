import { Migration } from '@mikro-orm/migrations'

export class Migration20250331185715_allow_email_contact extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "user" add column "allow_email_contact" boolean not null default false;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "allow_email_contact";`)
  }
}
