import { Migration } from '@mikro-orm/migrations'

export class Migration20250411195940_allocate_ip_address extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibit" drop constraint "exhibit_hostname_id_foreign";`)

    this.addSql(`alter table "exhibit" drop constraint "exhibit_hostname_id_unique";`)
    this.addSql(`alter table "exhibit" drop column "hostname_id";`)

    this.addSql(
      `alter table "host" alter column "ip_address" type varchar(255) using ("ip_address"::varchar(255));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit" add column "hostname_id" int null;`)
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_hostname_id_foreign" foreign key ("hostname_id") references "host" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_hostname_id_unique" unique ("hostname_id");`,
    )

    this.addSql(`alter table "host" alter column "ip_address" drop default;`)
    this.addSql(
      `alter table "host" alter column "ip_address" type varchar(255) using ("ip_address"::varchar(255));`,
    )
  }
}
