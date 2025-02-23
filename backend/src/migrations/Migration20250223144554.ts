import { Migration } from '@mikro-orm/migrations'

export class Migration20250223144554 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "registration" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "event_id" varchar(255) not null, "name" varchar(255) not null, "email" varchar(255) not null, "nickname" varchar(255) not null, "message" text null, "data" jsonb not null);`,
    )
    this.addSql(
      `create index "registration_event_id_index" on "registration" ("event_id");`,
    )
    this.addSql(
      `alter table "registration" add constraint "registration_event_id_email_unique" unique ("event_id", "email");`,
    )

    this.addSql(
      `create table "session" ("sid" varchar(255) not null, "sess" jsonb not null, "expire" timestamptz not null, constraint "session_pkey" primary key ("sid"));`,
    )

    this.addSql(
      `create table "user" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "full_name" varchar(255) not null default '', "username" varchar(255) not null, "password" varchar(255) null, "bio" text not null default '', "is_administrator" boolean not null default false, "contacts" jsonb not null);`,
    )
    this.addSql(`create index "user_username_index" on "user" ("username");`)
    this.addSql(
      `alter table "user" add constraint "user_username_unique" unique ("username");`,
    )

    this.addSql(
      `create table "table" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "exhibitor_id" int null);`,
    )

    this.addSql(
      `create table "exhibit" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "title" varchar(255) not null, "text" text null, "table_id" int null, "exhibitor_id" int not null);`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_table_id_unique" unique ("table_id");`,
    )

    this.addSql(
      `alter table "table" add constraint "table_exhibitor_id_foreign" foreign key ("exhibitor_id") references "user" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `alter table "exhibit" add constraint "exhibit_table_id_foreign" foreign key ("table_id") references "table" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_exhibitor_id_foreign" foreign key ("exhibitor_id") references "user" ("id") on update cascade;`,
    )
  }
}
