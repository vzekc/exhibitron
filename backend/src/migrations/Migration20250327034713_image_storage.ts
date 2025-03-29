import { Migration } from '@mikro-orm/migrations'

export class Migration20250327034713_image_storage extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibit" drop constraint "exhibit_main_image_id_foreign";`)

    this.addSql(
      `create table "image_storage" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "data" bytea not null, "mime_type" varchar(255) not null, "filename" varchar(255) not null, "slug" varchar(255) not null, "width" int not null, "height" int not null);`,
    )
    this.addSql(
      `alter table "image_storage" add constraint "image_storage_slug_unique" unique ("slug");`,
    )

    this.addSql(
      `create table "document_image" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "image_id" int not null, "document_id" int not null);`,
    )
    this.addSql(
      `alter table "document_image" add constraint "document_image_image_id_unique" unique ("image_id");`,
    )

    this.addSql(
      `create table "profile_image" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "image_id" int not null, "thumbnail_id" int null, "user_id" int not null);`,
    )
    this.addSql(
      `alter table "profile_image" add constraint "profile_image_image_id_unique" unique ("image_id");`,
    )
    this.addSql(
      `alter table "profile_image" add constraint "profile_image_thumbnail_id_unique" unique ("thumbnail_id");`,
    )
    this.addSql(
      `alter table "profile_image" add constraint "profile_image_user_id_unique" unique ("user_id");`,
    )

    this.addSql(
      `create table "exhibit_image" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "image_id" int not null, "thumbnail_id" int null, "exhibit_id" int not null);`,
    )
    this.addSql(
      `alter table "exhibit_image" add constraint "exhibit_image_image_id_unique" unique ("image_id");`,
    )
    this.addSql(
      `alter table "exhibit_image" add constraint "exhibit_image_thumbnail_id_unique" unique ("thumbnail_id");`,
    )
    this.addSql(
      `alter table "exhibit_image" add constraint "exhibit_image_exhibit_id_unique" unique ("exhibit_id");`,
    )

    this.addSql(
      `alter table "document_image" add constraint "document_image_image_id_foreign" foreign key ("image_id") references "image_storage" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "document_image" add constraint "document_image_document_id_foreign" foreign key ("document_id") references "document" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "profile_image" add constraint "profile_image_image_id_foreign" foreign key ("image_id") references "image_storage" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "profile_image" add constraint "profile_image_thumbnail_id_foreign" foreign key ("thumbnail_id") references "image_storage" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "profile_image" add constraint "profile_image_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "exhibit_image" add constraint "exhibit_image_image_id_foreign" foreign key ("image_id") references "image_storage" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "exhibit_image" add constraint "exhibit_image_thumbnail_id_foreign" foreign key ("thumbnail_id") references "image_storage" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "exhibit_image" add constraint "exhibit_image_exhibit_id_foreign" foreign key ("exhibit_id") references "exhibit" ("id") on update cascade;`,
    )

    // Create trigger for automatic thumbnail deletion
    this.addSql(`
      CREATE OR REPLACE FUNCTION delete_thumbnail_on_null()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.thumbnail_id IS NULL AND OLD.thumbnail_id IS NOT NULL THEN
              DELETE FROM image_storage WHERE id = OLD.thumbnail_id;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER delete_thumbnail_trigger
          AFTER UPDATE ON exhibit_image
          FOR EACH ROW
          EXECUTE FUNCTION delete_thumbnail_on_null();
    `)

    // First migrate document images by extracting references from document HTML
    this.addSql(`
      WITH document_image_refs AS (
        SELECT DISTINCT 
          d.id as document_id,
          regexp_replace(match[1], '/api/images/', '') as image_slug
        FROM document d,
        regexp_matches(d.html, '/api/images/([^"]+)', 'g') as match
      )
      INSERT INTO image_storage (created_at, updated_at, data, mime_type, filename, slug, width, height)
      SELECT DISTINCT i.created_at, i.updated_at, i.data, i.mime_type, i.filename, i.slug, 0, 0
      FROM image i
      JOIN document_image_refs dir ON i.slug = dir.image_slug;
    `)

    this.addSql(`
      WITH document_image_refs AS (
        SELECT DISTINCT 
          d.id as document_id,
          regexp_replace(match[1], '/api/images/', '') as image_slug
        FROM document d,
        regexp_matches(d.html, '/api/images/([^"]+)', 'g') as match
      )
      INSERT INTO document_image (created_at, updated_at, image_id, document_id)
      SELECT i.created_at, i.updated_at, img_storage.id, dir.document_id
      FROM image i
      JOIN image_storage img_storage ON i.slug = img_storage.slug
      JOIN document_image_refs dir ON i.slug = dir.image_slug;
    `)

    this.addSql(`
      WITH document_image_refs AS (
        SELECT DISTINCT 
          d.id as document_id,
          regexp_replace(match[1], '/api/images/', '') as image_slug
        FROM document d,
        regexp_matches(d.html, '/api/images/([^"]+)', 'g') as match
      )
      DELETE FROM image i
      WHERE EXISTS (
        SELECT 1 FROM document_image_refs dir
        WHERE i.slug = dir.image_slug
      );
    `)

    // Then migrate remaining exhibit images
    this.addSql(`
      INSERT INTO image_storage (created_at, updated_at, data, mime_type, filename, slug, width, height)
      SELECT DISTINCT i.created_at, i.updated_at, i.data, i.mime_type, i.filename, i.slug, 0, 0
      FROM image i
      JOIN exhibit e ON e.main_image_id = i.id;
    `)

    this.addSql(`
      INSERT INTO exhibit_image (created_at, updated_at, image_id, exhibit_id)
      SELECT i.created_at, i.updated_at, img_storage.id, e.id
      FROM image i
      JOIN image_storage img_storage ON i.slug = img_storage.slug
      JOIN exhibit e ON e.main_image_id = i.id;
    `)

    this.addSql(`
      DELETE FROM image i
      WHERE EXISTS (
        SELECT 1 FROM exhibit e
        WHERE e.main_image_id = i.id
      );
    `)

    // Verify exactly three unmigrated images exist
    this.addSql(`
      DO $$
      DECLARE
        unmigrated_count integer;
        unmigrated_info text;
      BEGIN
        SELECT COUNT(*), 
               string_agg(
                 format('ID: %s, Filename: %s, Exhibit: %s, Document: %s, Page: %s', 
                   id, 
                   filename,
                   COALESCE(exhibit_id::text, 'NULL'),
                   COALESCE(document_id::text, 'NULL'),
                   COALESCE(page_id::text, 'NULL')
                 ), 
                 E'\n'
               )
        INTO unmigrated_count, unmigrated_info
        FROM image;

        IF unmigrated_count != 3 THEN
          RAISE notice 'Found % unmigrated images:%', unmigrated_count, unmigrated_info;
        END IF;
      END $$;
    `)

    this.addSql(`drop table if exists "image" cascade;`)

    this.addSql(`alter table "exhibit" drop constraint "exhibit_main_image_id_unique";`)
    this.addSql(`alter table "exhibit" drop column "main_image_id";`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "document_image" drop constraint "document_image_image_id_foreign";`)

    this.addSql(`alter table "profile_image" drop constraint "profile_image_image_id_foreign";`)

    this.addSql(`alter table "profile_image" drop constraint "profile_image_thumbnail_id_foreign";`)

    this.addSql(`alter table "exhibit_image" drop constraint "exhibit_image_image_id_foreign";`)

    this.addSql(`alter table "exhibit_image" drop constraint "exhibit_image_thumbnail_id_foreign";`)

    this.addSql(
      `create table "image" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "data" bytea not null, "thumbnail" bytea null, "mime_type" varchar(255) not null, "filename" varchar(255) not null, "slug" varchar(255) not null, "exhibit_id" int null, "page_id" int null, "document_id" int null);`,
    )
    this.addSql(`alter table "image" add constraint "image_slug_unique" unique ("slug");`)

    this.addSql(
      `alter table "image" add constraint "image_exhibit_id_foreign" foreign key ("exhibit_id") references "exhibit" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "image" add constraint "image_page_id_foreign" foreign key ("page_id") references "page" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "image" add constraint "image_document_id_foreign" foreign key ("document_id") references "document" ("id") on update cascade on delete set null;`,
    )

    // Drop the trigger and function
    this.addSql(`DROP TRIGGER IF EXISTS delete_thumbnail_trigger ON exhibit_image;`)
    this.addSql(`DROP FUNCTION IF EXISTS delete_thumbnail_on_null();`)

    this.addSql(`drop table if exists "image_storage" cascade;`)

    this.addSql(`drop table if exists "document_image" cascade;`)

    this.addSql(`drop table if exists "profile_image" cascade;`)

    this.addSql(`drop table if exists "exhibit_image" cascade;`)

    this.addSql(`alter table "exhibit" add column "main_image_id" int null;`)
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_main_image_id_foreign" foreign key ("main_image_id") references "image" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_main_image_id_unique" unique ("main_image_id");`,
    )
  }
}
