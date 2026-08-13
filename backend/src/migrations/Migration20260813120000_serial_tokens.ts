import { Migration } from '@mikro-orm/migrations'

/*
 * What lets the command-line serial client speak for an exhibitor. Only the
 * hash is stored, so this table identifies a token and authorises nothing.
 */
export class Migration20260813120000_serial_tokens extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "serial_token" (
        "id" serial primary key,
        "exhibitor_id" int not null,
        "token_hash" varchar(64) not null,
        "prefix" varchar(16) not null,
        "label" varchar(100) not null,
        "created_at" timestamptz not null,
        "expires_at" timestamptz not null,
        "last_used_at" timestamptz null,
        "revoked_at" timestamptz null
      );
    `)
    this.addSql(`
      alter table "serial_token"
        add constraint "serial_token_exhibitor_id_foreign"
        foreign key ("exhibitor_id") references "exhibitor" ("id") on update cascade;
    `)
    this.addSql(`create index "serial_token_token_hash_index" on "serial_token" ("token_hash");`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "serial_token" cascade;`)
  }
}
