import { Migration } from '@mikro-orm/migrations'

export class Migration20250320040833_add_document_model extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "document" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "html" text null);`,
    )

    this.addSql(
      `alter table "exhibit" add column "description_id" int null, add column "description_extension_id" int null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_description_id_foreign" foreign key ("description_id") references "document" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_description_extension_id_foreign" foreign key ("description_extension_id") references "document" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_description_id_unique" unique ("description_id");`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_description_extension_id_unique" unique ("description_extension_id");`,
    )

    this.addSql(`alter table "image" add column "document_id" int null;`)
    this.addSql(
      `alter table "image" add constraint "image_document_id_foreign" foreign key ("document_id") references "document" ("id") on update cascade on delete set null;`,
    )

    // Data migration: Create document rows from exhibit.text
    this.addSql(`
      WITH inserted_documents AS (
        INSERT INTO "document" ("created_at", "updated_at", "html")
        SELECT "created_at", "updated_at", "text"
        FROM "exhibit"
        WHERE "text" IS NOT NULL
        RETURNING "id", "html"
      )
      UPDATE "exhibit" e
      SET "description_id" = d.id
      FROM inserted_documents d
      WHERE e."text" = d."html" AND e."text" IS NOT NULL;
    `)

    // Update images to point to documents instead of exhibits
    this.addSql(`
      UPDATE "image" i
      SET 
        "document_id" = e."description_id",
        "exhibit_id" = NULL
      FROM "exhibit" e
      WHERE i."exhibit_id" = e."id" AND e."description_id" IS NOT NULL;
    `)
  }

  override async down(): Promise<void> {
    // Restore image references to their original exhibits
    this.addSql(`
      UPDATE "image" i
      SET 
        "exhibit_id" = e."id",
        "document_id" = NULL
      FROM "exhibit" e
      WHERE i."document_id" = e."description_id";
    `)

    // Clear document references from exhibits
    this.addSql(`
      UPDATE "exhibit" e
      SET "description_id" = NULL, "description_extension_id" = NULL
      WHERE "description_id" IS NOT NULL OR "description_extension_id" IS NOT NULL;
    `)

    this.addSql(`alter table "exhibit" drop constraint "exhibit_description_id_foreign";`)
    this.addSql(`alter table "exhibit" drop constraint "exhibit_description_extension_id_foreign";`)
    this.addSql(`alter table "image" drop constraint "image_document_id_foreign";`)
    this.addSql(`drop table if exists "document" cascade;`)
    this.addSql(`alter table "exhibit" drop constraint "exhibit_description_id_unique";`)
    this.addSql(`alter table "exhibit" drop constraint "exhibit_description_extension_id_unique";`)
    this.addSql(
      `alter table "exhibit" drop column "description_id", drop column "description_extension_id";`,
    )
    this.addSql(`alter table "image" drop column "document_id";`)
  }
}
