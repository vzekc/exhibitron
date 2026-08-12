import { Migration } from '@mikro-orm/migrations'

/*
 * A photo can now also come from the camera page an exhibitor opens on their
 * own device, and it arrives as a bare JPEG: the encoders live on the machine
 * at the booth, which fetches what is waiting and pushes the formats back.
 *
 * Photos taken before this ran are marked converted. Nothing is going to go
 * looking for their formats now, and a null would leave their pages saying the
 * old machines' copies were on their way for ever.
 */
export class Migration20260812120000_web_camera extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "visitor_photo"
        add column "source" text not null default 'booth',
        add column "converted_at" timestamptz null;
    `)
    this.addSql(`
      alter table "visitor_photo"
        add constraint "visitor_photo_source_check" check ("source" in ('booth', 'web'));
    `)
    this.addSql(`update "visitor_photo" set "converted_at" = "created_at";`)
    this.addSql(`create index "visitor_photo_source_index" on "visitor_photo" ("source");`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "visitor_photo_source_index";`)
    this.addSql(`
      alter table "visitor_photo"
        drop constraint "visitor_photo_source_check",
        drop column "source",
        drop column "converted_at";
    `)
  }
}
