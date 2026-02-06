import { Migration } from '@mikro-orm/migrations'

export class Migration20260206100000_exhibition_admins extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "user_admin_exhibitions" ("user_id" int not null, "exhibition_id" int not null, constraint "user_admin_exhibitions_pkey" primary key ("user_id", "exhibition_id"));`,
    )

    this.addSql(
      `alter table "user_admin_exhibitions" add constraint "user_admin_exhibitions_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "user_admin_exhibitions" add constraint "user_admin_exhibitions_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "user_admin_exhibitions" cascade;`)
  }
}
