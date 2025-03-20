import { Migration } from '@mikro-orm/migrations'

export class Migration20250320045023_add_document_model_to_page extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "page" add column "content_id" int null;`)
    this.addSql(
      `alter table "page" add constraint "page_content_id_foreign" foreign key ("content_id") references "document" ("id") on update cascade on delete set null;`,
    )
    this.addSql(`alter table "page" add constraint "page_content_id_unique" unique ("content_id");`)

    // Data migration: Create document rows from page.text
    this.addSql(`
      WITH inserted_documents AS (
        INSERT INTO "document" ("created_at", "updated_at", "html")
        SELECT "created_at", "updated_at", "text"
        FROM "page"
        WHERE "text" IS NOT NULL
        RETURNING "id", "html"
      )
      UPDATE "page" p
      SET "content_id" = d.id
      FROM inserted_documents d
      WHERE p."text" = d."html" AND p."text" IS NOT NULL;
    `)

    // Update images to point to documents instead of pages
    this.addSql(`
      UPDATE "image" i
      SET 
        "document_id" = p."content_id",
        "page_id" = NULL
      FROM "page" p
      WHERE i."page_id" = p."id" AND p."content_id" IS NOT NULL;
    `)
  }

  override async down(): Promise<void> {
    // Restore image references to their original pages
    this.addSql(`
      UPDATE "image" i
      SET 
        "page_id" = p."id",
        "document_id" = NULL
      FROM "page" p
      WHERE i."document_id" = p."content_id";
    `)

    // Clear document references from pages
    this.addSql(`
      UPDATE "page" p
      SET "content_id" = NULL
      WHERE "content_id" IS NOT NULL;
    `)

    this.addSql(`alter table "page" drop constraint "page_content_id_foreign";`)
    this.addSql(`alter table "page" drop constraint "page_content_id_unique";`)
    this.addSql(`alter table "page" drop column "content_id";`)
  }
}
