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

    // Create a temporary table to map exhibits to their documents
    this.addSql(`
      CREATE TEMPORARY TABLE exhibit_document_map (
        exhibit_id INT PRIMARY KEY,
        document_id INT
      );
    `)

    // Insert documents and record mapping in one transaction
    this.addSql(`
      DO $$
      DECLARE
        doc_id INT;
        ex_id INT;
      BEGIN
        FOR ex_id IN (SELECT id FROM "exhibit" WHERE "text" IS NOT NULL ORDER BY id)
        LOOP
          INSERT INTO "document" ("created_at", "updated_at", "html")
          SELECT "created_at", "updated_at", "text"
          FROM "exhibit"
          WHERE id = ex_id
          RETURNING id INTO doc_id;
          
          INSERT INTO exhibit_document_map (exhibit_id, document_id)
          VALUES (ex_id, doc_id);
        END LOOP;
      END $$;
    `)

    // Update exhibits using the mapping table
    this.addSql(`
      UPDATE "exhibit" e
      SET "description_id" = m.document_id
      FROM exhibit_document_map m
      WHERE e.id = m.exhibit_id;
    `)

    // Clean up temporary table
    this.addSql(`DROP TABLE exhibit_document_map;`)

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
    // Restore text from documents back to exhibits
    this.addSql(`
      UPDATE "exhibit" e
      SET "text" = d."html"
      FROM "document" d
      WHERE e."description_id" = d.id;
    `)

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
