import { Migration } from '@mikro-orm/migrations'

export class Migration20250319174414_fixup_for_cursor_migrations extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "registration" alter column "email" type citext using ("email"::citext);`,
    )

    this.addSql(`alter table "user" alter column "email" type citext using ("email"::citext);`)

    this.addSql(
      `alter table "exhibit" add constraint "exhibit_main_image_id_unique" unique ("main_image_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "registration" alter column "email" type varchar(255) using ("email"::varchar(255));`,
    )

    this.addSql(
      `alter table "user" alter column "email" type varchar(255) using ("email"::varchar(255));`,
    )

    this.addSql(`alter table "exhibit" drop constraint "exhibit_main_image_id_unique";`)
  }
}
