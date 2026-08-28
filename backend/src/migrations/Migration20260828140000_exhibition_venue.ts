import { Migration } from '@mikro-orm/migrations'

export class Migration20260828140000_exhibition_venue extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibition" add column "venue" varchar(255) null;`)
    this.addSql(`update "exhibition" set "venue" = 'CD Kaserne Celle' where "key" = 'cc2026';`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibition" drop column "venue";`)
  }
}
