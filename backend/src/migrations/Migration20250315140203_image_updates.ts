import { Migration } from '@mikro-orm/migrations'

export class Migration20250315140203_image_updates extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibitor" drop constraint "exhibitor_user_id_foreign";`)

    this.addSql(`alter table "exhibit" drop constraint "exhibit_exhibitor_id_foreign";`)

    this.addSql(`alter table "image" drop constraint "image_exhibit_id_fkey";`)
    this.addSql(`alter table "image" drop constraint "image_page_id_fkey";`)

    this.addSql(
      `alter table "exhibitor" add constraint "exhibitor_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "exhibit" add constraint "exhibit_exhibitor_id_foreign" foreign key ("exhibitor_id") references "exhibitor" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "image" alter column "created_at" type timestamptz using ("created_at"::timestamptz);`,
    )
    this.addSql(
      `alter table "image" alter column "updated_at" type timestamptz using ("updated_at"::timestamptz);`,
    )
    this.addSql(
      `alter table "image" add constraint "image_exhibit_id_foreign" foreign key ("exhibit_id") references "exhibit" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "image" add constraint "image_page_id_foreign" foreign key ("page_id") references "page" ("id") on update cascade on delete set null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit" drop constraint "exhibit_exhibitor_id_foreign";`)

    this.addSql(`alter table "exhibitor" drop constraint "exhibitor_user_id_foreign";`)

    this.addSql(`alter table "image" drop constraint "image_exhibit_id_foreign";`)
    this.addSql(`alter table "image" drop constraint "image_page_id_foreign";`)

    this.addSql(
      `alter table "exhibit" add constraint "exhibit_exhibitor_id_foreign" foreign key ("exhibitor_id") references "exhibitor" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "exhibitor" add constraint "exhibitor_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "image" alter column "created_at" type timestamptz(0) using ("created_at"::timestamptz(0));`,
    )
    this.addSql(
      `alter table "image" alter column "updated_at" type timestamptz(0) using ("updated_at"::timestamptz(0));`,
    )
    this.addSql(
      `alter table "image" add constraint "image_exhibit_id_fkey" foreign key ("exhibit_id") references "exhibit" ("id") on update no action on delete set null;`,
    )
    this.addSql(
      `alter table "image" add constraint "image_page_id_fkey" foreign key ("page_id") references "page" ("id") on update no action on delete set null;`,
    )
  }
}
