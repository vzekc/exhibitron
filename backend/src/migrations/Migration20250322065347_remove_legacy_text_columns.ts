import { Migration } from '@mikro-orm/migrations'

export class Migration20250322065347_remove_legacy_text_columns extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "page" drop column "text";`)

    this.addSql(`alter table "exhibit" drop column "text";`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "page" add column "text" text not null;`)

    this.addSql(`alter table "exhibit" add column "text" text null;`)
  }
}
