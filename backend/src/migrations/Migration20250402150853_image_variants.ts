import { Migration } from '@mikro-orm/migrations'

export class Migration20250402150853_image_variants extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "image_variant" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "data" bytea not null, "width" int not null, "height" int not null, "variant_name" varchar(255) not null, "original_image_id" int not null);`,
    )

    this.addSql(
      `alter table "image_variant" add constraint "image_variant_original_image_id_foreign" foreign key ("original_image_id") references "image_storage" ("id") on update cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "image_variant" cascade;`)
  }
}
