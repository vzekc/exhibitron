import { Migration } from '@mikro-orm/migrations'

export class Migration20250219063808 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "user" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "full_name" varchar(255) not null default '', "username" varchar(255) not null, "password" varchar(255) not null, "bio" text not null default '', "is_administrator" boolean not null default false, "contacts" jsonb not null);`,
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
