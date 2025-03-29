import { Migration } from '@mikro-orm/migrations'

export class Migration20250325180139_add_thumbnail extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "image" add column "thumbnail" bytea null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "image" drop column "thumbnail";`)
  }
}
