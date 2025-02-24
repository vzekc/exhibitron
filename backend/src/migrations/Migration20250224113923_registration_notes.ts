import { Migration } from '@mikro-orm/migrations'

export class Migration20250224113923_registration_notes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "registration" add column "notes" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "registration" drop column "notes";`)
  }
}
