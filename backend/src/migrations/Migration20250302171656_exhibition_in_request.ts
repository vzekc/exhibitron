import { Migration } from '@mikro-orm/migrations'

export class Migration20250302171656_exhibition_in_request extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibition" add column "host_match" varchar(255);`)
    this.addSql(`update "exhibition" set "host_match" = '.*';`)
    this.addSql(`alter table "exhibition" alter column "host_match" set not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibition" drop column "host_match";`)
  }
}
