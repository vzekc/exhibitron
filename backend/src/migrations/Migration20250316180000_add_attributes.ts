import { Migration } from '@mikro-orm/migrations'

export class Migration20250316180000_add_attributes extends Migration {
  async up(): Promise<void> {
    // Create attribute table
    this.addSql(`
      create table "attribute" (
        "id" serial primary key,
        "created_at" timestamptz(0) not null,
        "updated_at" timestamptz(0) null,
        "name" varchar(255) not null
      );
    `)

    // Add unique constraint to attribute name
    this.addSql(`
      alter table "attribute" add constraint "attribute_name_unique" unique ("name");
    `)

    // Add attributes column to exhibit table
    this.addSql(`
      alter table "exhibit" add column "attributes" jsonb null;
    `)
  }

  async down(): Promise<void> {
    // Remove attributes column from exhibit table
    this.addSql(`
      alter table "exhibit" drop column "attributes";
    `)

    // Drop attribute table
    this.addSql(`
      drop table if exists "attribute";
    `)
  }
}
