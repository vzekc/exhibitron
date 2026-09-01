import { Migration } from '@mikro-orm/migrations'

export class Migration20260901150000_keep_registrations_on_user_delete extends Migration {
  /*
   * A registration outlives the account it belongs to: rejecting an approved
   * registration deletes an account that nothing else needs, and the
   * registration must stay on file as the record of the rejection. The paths
   * that do want registrations gone delete them themselves
   * (ExhibitorRepository.cancelParticipation, the exhibition cleanup).
   */
  async up(): Promise<void> {
    this.addSql(`
      DROP TRIGGER IF EXISTS trigger_delete_registrations_after_user_delete ON "user";
    `)
    this.addSql(`
      DROP FUNCTION IF EXISTS delete_registrations_for_user();
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      CREATE OR REPLACE FUNCTION delete_registrations_for_user()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM "registration" WHERE "email" = OLD.email;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `)
    this.addSql(`
      CREATE TRIGGER trigger_delete_registrations_after_user_delete
      AFTER DELETE ON "user"
      FOR EACH ROW
      EXECUTE FUNCTION delete_registrations_for_user();
    `)
  }
}
