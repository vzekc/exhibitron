import { Migration } from '@mikro-orm/migrations'

export class Migration20250315135748_cascading_delete extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE CASCADE;',
    )

    this.addSql('ALTER TABLE "exhibitor" DROP CONSTRAINT "exhibitor_user_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibitor" ADD CONSTRAINT "exhibitor_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON UPDATE CASCADE ON DELETE CASCADE;',
    )
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "exhibit" DROP CONSTRAINT "exhibit_exhibitor_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibit" ADD CONSTRAINT "exhibit_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE SET NULL;',
    )

    this.addSql('ALTER TABLE "exhibitor" DROP CONSTRAINT "exhibitor_user_id_foreign";')
    this.addSql(
      'ALTER TABLE "exhibitor" ADD CONSTRAINT "exhibitor_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON UPDATE CASCADE;',
    )
  }
}
