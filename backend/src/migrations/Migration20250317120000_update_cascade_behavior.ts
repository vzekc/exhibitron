import { Migration } from '@mikro-orm/migrations'

export class Migration20250317120000_update_cascade_behavior extends Migration {
  async up(): Promise<void> {
    // Modify the constraint between exhibit and table
    // When a table is deleted, any exhibit referencing it should have the table_id set to NULL
    this.addSql('ALTER TABLE "exhibit" DROP CONSTRAINT IF EXISTS "exhibit_table_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_table_id_foreign" FOREIGN KEY ("table_id") REFERENCES "table" ("id") ON UPDATE CASCADE ON DELETE SET NULL;',
    )

    // Change the exhibitor cascade behavior for the table
    // When an exhibitor is deleted, the table.exhibitor_id should be set to NULL
    this.addSql('ALTER TABLE "table" DROP CONSTRAINT IF EXISTS "table_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "table" ADD CONSTRAINT "table_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE SET NULL;',
    )
  }

  async down(): Promise<void> {
    // Revert to previous CASCADE behavior from Migration20250315160000_exhibit_cascade_delete.ts
    this.addSql('ALTER TABLE "table" DROP CONSTRAINT IF EXISTS "table_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "table" ADD CONSTRAINT "table_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE CASCADE;',
    )
  }
}
