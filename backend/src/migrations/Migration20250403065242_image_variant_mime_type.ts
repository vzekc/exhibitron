import { Migration } from '@mikro-orm/migrations'

export class Migration20250403065242_image_variant_mime_type extends Migration {
  override async up(): Promise<void> {
    this.addSql(`truncate "image_variant"`)
    this.addSql(`alter table "image_variant" add column "mime_type" varchar(255) not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "image_variant" drop column "mime_type";`)
  }
}
