import { Migration } from '@mikro-orm/migrations'

export class Migration20250913034621 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibit" add column "touch_me" boolean not null default false;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit" drop column "touch_me";`)
  }
}
