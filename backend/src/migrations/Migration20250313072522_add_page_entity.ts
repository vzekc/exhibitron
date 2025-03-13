import { Migration } from '@mikro-orm/migrations'

export class Migration20250313072522_add_page_entity extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "page" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "key" varchar(255) not null, "exhibition_id" int not null, "title" varchar(255) not null, "text" varchar(255) not null);`,
    )
    this.addSql(
      `alter table "page" add constraint "page_key_unique" unique ("key");`,
    )
    this.addSql(
      `alter table "page" add constraint "page_exhibition_id_key_unique" unique ("exhibition_id", "key");`,
    )

    this.addSql(
      `alter table "page" add constraint "page_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "page" cascade;`)
  }
}
