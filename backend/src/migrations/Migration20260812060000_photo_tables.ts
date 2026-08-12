import { Migration } from '@mikro-orm/migrations'

/*
 * Taking part in the photo trail belongs to a table, not to an exhibitor: an
 * exhibitor with two tables may only have the right machine on one of them.
 */
export class Migration20260812060000_photo_tables extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "table" add column "shows_visitor_photos" boolean not null default false;`,
    )

    /* Anyone who had already said yes keeps saying it, for every table they hold. */
    this.addSql(`
      update "table" set "shows_visitor_photos" = true
      where "exhibitor_id" in (select "id" from "exhibitor" where "shows_visitor_photos" = true);
    `)

    this.addSql(`alter table "exhibitor" drop column "shows_visitor_photos";`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "exhibitor" add column "shows_visitor_photos" boolean not null default false;`,
    )
    this.addSql(`
      update "exhibitor" set "shows_visitor_photos" = true
      where "id" in (select "exhibitor_id" from "table" where "shows_visitor_photos" = true);
    `)
    this.addSql(`alter table "table" drop column "shows_visitor_photos";`)
  }
}
