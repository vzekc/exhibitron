import { Migration } from '@mikro-orm/migrations'

export class Migration20260206062135_refactor_conference_session_duration extends Migration {
  override async up(): Promise<void> {
    // Add duration_minutes column
    this.addSql(`alter table "conference_session" add column "duration_minutes" int null;`)

    // Migrate existing data: calculate duration from start_time and end_time
    this.addSql(
      `update "conference_session" set "duration_minutes" = extract(epoch from ("end_time" - "start_time")) / 60 where "start_time" is not null and "end_time" is not null;`,
    )

    // Drop end_time column
    this.addSql(`alter table "conference_session" drop column "end_time";`)
  }

  override async down(): Promise<void> {
    // Add end_time column back
    this.addSql(`alter table "conference_session" add column "end_time" timestamptz null;`)

    // Migrate data back: calculate end_time from start_time and duration_minutes
    this.addSql(
      `update "conference_session" set "end_time" = "start_time" + ("duration_minutes" * interval '1 minute') where "start_time" is not null and "duration_minutes" is not null;`,
    )

    // Drop duration_minutes column
    this.addSql(`alter table "conference_session" drop column "duration_minutes";`)
  }
}
