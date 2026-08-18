import { Migration } from '@mikro-orm/migrations'

/*
 * The meeting point went out of the plan again: where to turn up belongs in
 * the description of the activity, which is written once, rather than in every
 * period of it.
 */
export class Migration20260818140000_volunteer_period_without_note extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "volunteer_period" drop column "note";`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "volunteer_period" add column "note" text null;`)
  }
}
