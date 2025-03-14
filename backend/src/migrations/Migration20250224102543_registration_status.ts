import { Migration } from '@mikro-orm/migrations'

export class Migration20250224102543_registration_status extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create type "registration_status" as enum ('new', 'approved', 'rejected');`)
    this.addSql(
      `alter table "registration" add column "status" "registration_status" not null default 'new';`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "registration" drop column "status";`)

    this.addSql(`drop type "registration_status";`)
  }
}
