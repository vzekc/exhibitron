import { Migration } from '@mikro-orm/migrations'

export class Migration20250322082551_add_image_slug extends Migration {
  override async up(): Promise<void> {
    // Add the slug column
    this.addSql(`ALTER TABLE "image" ADD COLUMN "slug" varchar(255);`)

    // Generate random slugs for all existing images
    this.addSql(`
      DO $$
      DECLARE
        img RECORD;
        new_slug VARCHAR;
      BEGIN
        FOR img IN SELECT id FROM image LOOP
          -- Use PostgreSQL's UUID generation instead of Node.js
          new_slug := gen_random_uuid();

          -- Update the image with the generated slug
          EXECUTE 'UPDATE image SET slug = $1 WHERE id = $2'
          USING new_slug, img.id;

          -- Update document HTML to replace /api/images/[id] with /api/images/[slug]
          EXECUTE 'UPDATE document SET html = REPLACE(html, $1, $2) WHERE html LIKE $3'
          USING '/api/images/' || img.id || '"', '/api/images/' || new_slug || '"', '%/api/images/' || img.id || '"%';
        END LOOP;
      END $$;
    `)

    // Make the slug column required and unique after updating all records
    this.addSql(`ALTER TABLE "image" ALTER COLUMN "slug" SET NOT NULL;`)
    this.addSql(`ALTER TABLE "image" ADD CONSTRAINT "image_slug_unique" UNIQUE ("slug");`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "image" DROP CONSTRAINT "image_slug_unique";`)
    this.addSql(`ALTER TABLE "image" DROP COLUMN "slug";`)
  }
}
