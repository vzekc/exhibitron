import { Migration } from '@mikro-orm/migrations'

export class Migration20260205000000_copy_admin_exhibitors extends Migration {
  override async up(): Promise<void> {
    // Copy exhibitor records for administrators from cc2025 to cc2026
    // This ensures admins can access the new exhibition immediately
    await this.execute(`
      INSERT INTO exhibitor (user_id, exhibition_id, created_at, updated_at)
      SELECT e.user_id, ex_new.id, now(), now()
      FROM exhibitor e
      JOIN "user" u ON e.user_id = u.id
      JOIN exhibition ex_old ON e.exhibition_id = ex_old.id
      JOIN exhibition ex_new ON ex_new.key = 'cc2026'
      WHERE ex_old.key = 'cc2025'
        AND u.is_administrator = true
        AND NOT EXISTS (
          SELECT 1 FROM exhibitor e2
          WHERE e2.user_id = e.user_id
            AND e2.exhibition_id = ex_new.id
        )
    `)
  }

  override async down(): Promise<void> {
    // Remove exhibitor records that were copied for administrators
    // (only those that don't have any exhibits, tables, etc.)
    await this.execute(`
      DELETE FROM exhibitor
      WHERE exhibition_id = (SELECT id FROM exhibition WHERE key = 'cc2026')
        AND user_id IN (SELECT id FROM "user" WHERE is_administrator = true)
        AND NOT EXISTS (SELECT 1 FROM exhibit WHERE exhibitor_id = exhibitor.id)
        AND NOT EXISTS (SELECT 1 FROM "table" WHERE exhibitor_id = exhibitor.id)
    `)
  }
}
