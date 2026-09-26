import { Migration } from '@mikro-orm/migrations'

/*
 * A checkbox question can mark the tables of those who ticked it on the
 * seating plan. The network questions asked so far get their markers.
 */
export class Migration20260926090000_survey_map_marker extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "survey_question" add column "map_marker" jsonb null;`)
    const markers: Array<[string, string, string, string]> = [
      ['ethernet', 'E', 'Ethernet', '#1565c0'],
      ['ethernet-aui', 'A', 'AUI', '#6a1b9a'],
      ['ethernet-bnc', 'B', 'BNC', '#00796b'],
      ['rs232', 'S', 'Seriell', '#e65100'],
    ]
    for (const [key, letter, label, color] of markers) {
      this.addSql(
        `update "survey_question" set "map_marker" = '${JSON.stringify({ letter, label, color })}' where "key" = '${key}' and "type" = 'checkbox';`,
      )
    }
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "survey_question" drop column "map_marker";`)
  }
}
