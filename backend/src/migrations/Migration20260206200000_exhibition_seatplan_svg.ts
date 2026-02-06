import { Migration } from '@mikro-orm/migrations'

export class Migration20260206200000_exhibition_seatplan_svg extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibition" add column "seatplan_svg" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibition" drop column "seatplan_svg";`)
  }
}
