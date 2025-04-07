import { Migration } from '@mikro-orm/migrations'

export class Migration20250407193504_schedule extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "room" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "name" varchar(255) not null, "exhibition_id" int not null);`,
    )

    this.addSql(
      `create table "conference_session" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "title" varchar(255) not null, "start_time" timestamptz null, "end_time" timestamptz null, "exhibition_id" int not null, "room_id" int null, "description_id" int null);`,
    )

    this.addSql(
      `create table "conference_session_exhibitors" ("conference_session_id" int not null, "exhibitor_id" int not null, constraint "conference_session_exhibitors_pkey" primary key ("conference_session_id", "exhibitor_id"));`,
    )

    this.addSql(
      `alter table "room" add constraint "room_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "conference_session" add constraint "conference_session_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade;`,
    )
    this.addSql(
      `alter table "conference_session" add constraint "conference_session_room_id_foreign" foreign key ("room_id") references "room" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "conference_session" add constraint "conference_session_description_id_foreign" foreign key ("description_id") references "document" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `alter table "conference_session_exhibitors" add constraint "conference_session_exhibitors_conference_session_id_foreign" foreign key ("conference_session_id") references "conference_session" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "conference_session_exhibitors" add constraint "conference_session_exhibitors_exhibitor_id_foreign" foreign key ("exhibitor_id") references "exhibitor" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "exhibition" add column "start_date" timestamptz null, add column "end_date" timestamptz null;`,
    )
    this.addSql(
      `update "exhibition" set "start_date" = '2025-09-12 00:00:00+02', "end_date" = '2025-09-14 23:59:59+02';`,
    )
    this.addSql(
      `alter table "exhibition" alter column "start_date" set not null, alter column "end_date" set not null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "conference_session" drop constraint "conference_session_room_id_foreign";`,
    )

    this.addSql(
      `alter table "conference_session_exhibitors" drop constraint "conference_session_exhibitors_conference_session_id_foreign";`,
    )

    this.addSql(`drop table if exists "room" cascade;`)

    this.addSql(`drop table if exists "conference_session" cascade;`)

    this.addSql(`drop table if exists "conference_session_exhibitors" cascade;`)

    this.addSql(`alter table "exhibition" drop column "start_date", drop column "end_date";`)
  }
}
