import { Migration } from '@mikro-orm/migrations'

/*
 * Volunteers signing up for stretches of time in which an activity needs help.
 *
 * `user.email_verified_at` starts filled for every account that exists today:
 * each of them was created through an approved registration or a forum login,
 * and both prove the address.
 */
export class Migration20260818120000_volunteer_shifts extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "volunteer_activity" (
        "id" serial primary key,
        "created_at" timestamptz not null,
        "updated_at" timestamptz null,
        "exhibition_id" int not null,
        "key" varchar(255) not null,
        "name" varchar(255) not null,
        "summary" varchar(255) not null,
        "description_id" int null,
        "contact_id" int null,
        "ordering" int not null default 0
      );
    `)
    this.addSql(`
      alter table "volunteer_activity"
        add constraint "volunteer_activity_exhibition_id_foreign"
        foreign key ("exhibition_id") references "exhibition" ("id") on update cascade;
    `)
    this.addSql(`
      alter table "volunteer_activity"
        add constraint "volunteer_activity_description_id_foreign"
        foreign key ("description_id") references "document" ("id")
        on update cascade on delete set null;
    `)
    this.addSql(`
      alter table "volunteer_activity"
        add constraint "volunteer_activity_contact_id_foreign"
        foreign key ("contact_id") references "exhibitor" ("id")
        on update cascade on delete set null;
    `)
    this.addSql(`
      alter table "volunteer_activity"
        add constraint "volunteer_activity_exhibition_id_key_unique"
        unique ("exhibition_id", "key");
    `)

    this.addSql(`
      create table "volunteer_period" (
        "id" serial primary key,
        "created_at" timestamptz not null,
        "updated_at" timestamptz null,
        "activity_id" int not null,
        "start_time" timestamptz not null,
        "duration_minutes" int not null,
        "needed_count" int null,
        "note" text null
      );
    `)
    this.addSql(`
      alter table "volunteer_period"
        add constraint "volunteer_period_activity_id_foreign"
        foreign key ("activity_id") references "volunteer_activity" ("id")
        on update cascade on delete cascade;
    `)

    this.addSql(`
      create table "volunteer_booking" (
        "id" serial primary key,
        "created_at" timestamptz not null,
        "updated_at" timestamptz null,
        "period_id" int not null,
        "user_id" int not null,
        "start_time" timestamptz not null,
        "duration_minutes" int not null,
        "reminder_sent_at" timestamptz null,
        "digest_sent_at" timestamptz null
      );
    `)
    this.addSql(`
      alter table "volunteer_booking"
        add constraint "volunteer_booking_period_id_foreign"
        foreign key ("period_id") references "volunteer_period" ("id")
        on update cascade on delete cascade;
    `)
    this.addSql(`
      alter table "volunteer_booking"
        add constraint "volunteer_booking_user_id_foreign"
        foreign key ("user_id") references "user" ("id")
        on update cascade on delete cascade;
    `)
    this.addSql(
      `create index "volunteer_booking_start_time_index" on "volunteer_booking" ("start_time");`,
    )

    this.addSql(`alter table "user" add column "email_verified_at" timestamptz null;`)
    this.addSql(`update "user" set "email_verified_at" = "created_at";`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "user" drop column "email_verified_at";`)
    this.addSql(`drop table if exists "volunteer_booking" cascade;`)
    this.addSql(`drop table if exists "volunteer_period" cascade;`)
    this.addSql(`drop table if exists "volunteer_activity" cascade;`)
  }
}
