import { Migration } from '@mikro-orm/migrations'

export class Migration20250314184500_add_image_entity extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table "image" (
        "id" serial primary key,
        "created_at" timestamptz(0) not null,
        "updated_at" timestamptz(0) null,
        "data" bytea not null,
        "mime_type" varchar(255) not null,
        "filename" varchar(255) not null,
        "exhibit_id" int null references "exhibit" ("id") on delete set null,
        "page_id" int null references "page" ("id") on delete set null
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "image";')
  }
}
