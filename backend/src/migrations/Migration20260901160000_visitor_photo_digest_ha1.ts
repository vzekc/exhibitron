import { Migration } from '@mikro-orm/migrations'

export class Migration20260901160000_visitor_photo_digest_ha1 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "visitor_photo" add column "digest_ha1" varchar(32) null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "visitor_photo" drop column "digest_ha1";`)
  }
}
