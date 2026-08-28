import { Migration } from '@mikro-orm/migrations'

export class Migration20260828120000_exhibitor_name_tag extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibitor" add column "name_tag_name" varchar(255) null;`)
    this.addSql(
      `alter table "exhibitor" add column "name_tag_show_nickname" boolean not null default true;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibitor" drop column "name_tag_show_nickname";`)
    this.addSql(`alter table "exhibitor" drop column "name_tag_name";`)
  }
}
