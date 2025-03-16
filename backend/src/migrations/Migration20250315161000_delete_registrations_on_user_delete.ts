import { Migration } from '@mikro-orm/migrations'

export class Migration20250315161000_delete_registrations_on_user_delete extends Migration {
  async up(): Promise<void> {
    // Create a function that will be called by the trigger
    this.addSql(`
      CREATE OR REPLACE FUNCTION delete_registrations_for_user()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Delete registrations with the same email as the deleted user
        DELETE FROM "registration" WHERE "email" = OLD.email;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `)

    // Create a trigger that calls the function after a user is deleted
    this.addSql(`
      CREATE TRIGGER trigger_delete_registrations_after_user_delete
      AFTER DELETE ON "user"
      FOR EACH ROW
      EXECUTE FUNCTION delete_registrations_for_user();
    `)
  }

  async down(): Promise<void> {
    // Drop the trigger
    this.addSql(`
      DROP TRIGGER IF EXISTS trigger_delete_registrations_after_user_delete ON "user";
    `)

    // Drop the function
    this.addSql(`
      DROP FUNCTION IF EXISTS delete_registrations_for_user();
    `)
  }
}
