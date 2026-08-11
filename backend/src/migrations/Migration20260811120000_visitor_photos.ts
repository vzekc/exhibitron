import { Migration } from '@mikro-orm/migrations'

export class Migration20260811120000_visitor_photos extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "visitor_photo" (
        "id" varchar(6) not null,
        "exhibition_id" int not null,
        "code_hash" varchar(64) not null,
        "tables" jsonb not null default '[]',
        "created_at" timestamptz not null,
        "deleted_at" timestamptz null,
        constraint "visitor_photo_pkey" primary key ("id")
      );
    `)
    this.addSql(`
      alter table "visitor_photo"
        add constraint "visitor_photo_exhibition_id_foreign"
        foreign key ("exhibition_id") references "exhibition" ("id") on update cascade;
    `)
    this.addSql(`create index "visitor_photo_deleted_at_index" on "visitor_photo" ("deleted_at");`)

    this.addSql(`
      alter table "exhibitor"
        add column "shows_visitor_photos" boolean not null default false;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibitor" drop column "shows_visitor_photos";`)
    this.addSql(`drop table if exists "visitor_photo" cascade;`)
  }
}
