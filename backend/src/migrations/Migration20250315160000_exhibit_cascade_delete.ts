import { Migration } from '@mikro-orm/migrations'

export class Migration20250315160000_exhibit_cascade_delete extends Migration {
  async up(): Promise<void> {
    // Drop the existing foreign key constraint
    this.addSql('ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_exhibitor_id_foreign";')

    // Add the new constraint with ON DELETE CASCADE
    this.addSql(
      'ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE CASCADE;',
    )

    // Also check and update the table constraint if needed
    this.addSql('ALTER TABLE "table" DROP CONSTRAINT IF EXISTS "table_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "table" ADD CONSTRAINT "table_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE CASCADE;',
    )
  }

  async down(): Promise<void> {
    // Revert the changes
    this.addSql('ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE;',
    )

    this.addSql('ALTER TABLE "table" DROP CONSTRAINT IF EXISTS "table_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "table" ADD CONSTRAINT "table_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE SET NULL;',
    )
  }
}
