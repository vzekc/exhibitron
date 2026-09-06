import { Migration } from '@mikro-orm/migrations'

/*
 * A question may be put to a group of exhibitors rather than all of them. The
 * first group is the fotofix participants, read from their tables.
 */
export class Migration20260906180000_survey_audience extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create type "survey_audience" as enum ('fotofix');`)
    this.addSql(`alter table "survey_question" add column "audience" "survey_audience" null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "survey_question" drop column "audience";`)
    this.addSql(`drop type "survey_audience";`)
  }
}
