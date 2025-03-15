import { Migration } from '@mikro-orm/migrations'

export class Migration20250315152959_user_exhibitor_cascade extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "exhibitor" DROP CONSTRAINT "exhibitor_user_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibitor" ADD CONSTRAINT "exhibitor_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE;',
    )
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "exhibitor" DROP CONSTRAINT "exhibitor_user_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibitor" ADD CONSTRAINT "exhibitor_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON UPDATE CASCADE;',
    )
  }
}
