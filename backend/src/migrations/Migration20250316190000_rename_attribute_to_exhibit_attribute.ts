import { Migration } from '@mikro-orm/migrations'

export class Migration20250316190000_rename_attribute_to_exhibit_attribute extends Migration {
  async up(): Promise<void> {
    // Rename the table
    this.addSql(`
      ALTER TABLE "attribute" RENAME TO "exhibit_attribute";
    `)

    // Rename the constraint
    this.addSql(`
      ALTER TABLE "exhibit_attribute" RENAME CONSTRAINT "attribute_name_unique" TO "exhibit_attribute_name_unique";
    `)
  }

  async down(): Promise<void> {
    // Rename the constraint back
    this.addSql(`
      ALTER TABLE "exhibit_attribute" RENAME CONSTRAINT "exhibit_attribute_name_unique" TO "attribute_name_unique";
    `)

    // Rename the table back
    this.addSql(`
      ALTER TABLE "exhibit_attribute" RENAME TO "attribute";
    `)
  }
}
