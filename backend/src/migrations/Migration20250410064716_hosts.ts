import { Migration } from '@mikro-orm/migrations'

export class Migration20250410064716_hosts extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "host" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz null, "name" varchar(255) not null, "ip_address" varchar(255) not null, "services" text[] not null, "exhibition_id" int not null, "exhibitor_id" int null, "exhibit_id" int null);`,
    )
    this.addSql(`alter table "host" add constraint "host_name_unique" unique ("name");`)
    this.addSql(`alter table "host" add constraint "host_ip_address_unique" unique ("ip_address");`)
    this.addSql(`alter table "host" add constraint "host_exhibit_id_unique" unique ("exhibit_id");`)

    this.addSql(
      `alter table "host" add constraint "host_exhibition_id_foreign" foreign key ("exhibition_id") references "exhibition" ("id") on update cascade;`,
    )
    this.addSql(
      `alter table "host" add constraint "host_exhibitor_id_foreign" foreign key ("exhibitor_id") references "exhibitor" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "host" add constraint "host_exhibit_id_foreign" foreign key ("exhibit_id") references "exhibit" ("id") on update cascade on delete set null;`,
    )

    this.addSql(`alter table "exhibition" add column "dns_zone" varchar(255) null;`)
    this.addSql(
      `update "exhibition" set "dns_zone" = '2025.classic-computing.de' where "key" = 'cc2025';`,
    )

    this.addSql(`alter table "exhibit" add column "hostname_id" int null;`)
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_hostname_id_foreign" foreign key ("hostname_id") references "host" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "exhibit" add constraint "exhibit_hostname_id_unique" unique ("hostname_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit" drop constraint "exhibit_hostname_id_foreign";`)

    this.addSql(`drop table if exists "host" cascade;`)

    this.addSql(`alter table "exhibition" drop column "dns_zone";`)

    this.addSql(`alter table "exhibit" drop constraint "exhibit_hostname_id_unique";`)
    this.addSql(`alter table "exhibit" drop column "hostname_id";`)
  }
}
