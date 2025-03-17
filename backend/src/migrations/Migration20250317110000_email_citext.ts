import { Migration } from '@mikro-orm/migrations'

export class Migration20250317110000 extends Migration {
  async up(): Promise<void> {
    // Add citext extension if it doesn't exist
    this.addSql('create extension if not exists citext;')

    // Update email columns to use citext
    this.addSql('alter table "user" alter column "email" type citext;')
    this.addSql('alter table "registration" alter column "email" type citext;')
  }

  async down(): Promise<void> {
    // Revert email columns back to text
    this.addSql('alter table "user" alter column "email" type text;')
    this.addSql('alter table "registration" alter column "email" type text;')

    // Note: We don't drop the citext extension as it might be used by other parts of the database
  }
}
