import { Migration } from '@mikro-orm/migrations'

export class Migration20260204000000_cc2026_exhibition extends Migration {
  override async up(): Promise<void> {
    // Add frozen and location columns to exhibition
    this.addSql(`alter table "exhibition" add column "frozen" boolean not null default false;`)
    this.addSql(`alter table "exhibition" add column "location" varchar(255) null;`)

    // Update cc2025: set location, freeze it, and make host_match specific to production
    this.addSql(`
      update "exhibition"
      set location = 'in der Freiheitshalle in Hof',
          frozen = true,
          host_match = '2025\\.classic-computing\\.de|.*2025.*'
      where key = 'cc2025';
    `)

    // Create cc2026 exhibition (matches localhost and other hosts)
    this.addSql(`
      insert into "exhibition" (key, title, host_match, start_date, end_date, dns_zone, location, frozen, created_at, updated_at)
      values (
        'cc2026',
        'Classic Computing 2026',
        '2026\\.classic-computing\\.de|localhost|127\\.0\\.0\\.1|\\[::1\\]',
        '2026-10-09 00:00:00+02',
        '2026-10-11 23:59:59+02',
        '2026.classic-computing.de',
        'in der CD Kaserne in Celle',
        false,
        now(),
        now()
      );
    `)
  }

  override async down(): Promise<void> {
    // Delete cc2026
    this.addSql(`delete from "exhibition" where key = 'cc2026';`)

    // Restore cc2025 to default state
    this.addSql(`
      update "exhibition"
      set host_match = '.*'
      where key = 'cc2025';
    `)

    // Drop columns
    this.addSql(`alter table "exhibition" drop column "location";`)
    this.addSql(`alter table "exhibition" drop column "frozen";`)
  }
}
