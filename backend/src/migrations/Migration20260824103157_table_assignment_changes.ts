import { Migration } from '@mikro-orm/migrations'

/*
 * A table changing hands is a single column that the next change overwrites,
 * so the exhibitors it happened to had no way of learning about it. Each
 * change is written down here as it is made, and the daily digest reads it.
 *
 * The exhibitors and the actor are let go rather than kept alive by the row:
 * an account that leaves takes its name out of the record without taking the
 * record with it.
 */
export class Migration20260824103157_table_assignment_changes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "table_assignment_change" (
      "id" serial primary key,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      "exhibition_id" int not null,
      "table_number" int not null,
      "previous_exhibitor_id" int null,
      "new_exhibitor_id" int null,
      "actor_id" int null,
      "notified_at" timestamptz null
    );`)
    this.addSql(
      `create index "table_assignment_change_notified_at_index" on "table_assignment_change" ("notified_at");`,
    )
    this.addSql(
      `alter table "table_assignment_change" add constraint "table_assignment_change_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "table_assignment_change" add constraint "table_assignment_change_previous_exhibitor_id_foreign" foreign key ("previous_exhibitor_id") references "exhibitor" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "table_assignment_change" add constraint "table_assignment_change_new_exhibitor_id_foreign" foreign key ("new_exhibitor_id") references "exhibitor" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "table_assignment_change" add constraint "table_assignment_change_actor_id_foreign" foreign key ("actor_id") references "user" ("id") on update cascade on delete set null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "table_assignment_change" cascade;`)
  }
}
