import { Migration } from '@mikro-orm/migrations'

export class Migration20250317100000 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "exhibit" add column "main_image_id" int null;')
    this.addSql(
      'alter table "exhibit" add constraint "exhibit_main_image_id_foreign" foreign key ("main_image_id") references "image" ("id") on update cascade on delete set null;',
    )
  }

  async down(): Promise<void> {
    this.addSql('alter table "exhibit" drop constraint "exhibit_main_image_id_foreign";')
    this.addSql('alter table "exhibit" drop column "main_image_id";')
  }
}
