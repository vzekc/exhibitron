import { Migration } from '@mikro-orm/migrations'

export class Migration20250302154427_multi_exhibition extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
CREATE TABLE "exhibition"
(
    "id"         SERIAL PRIMARY KEY,
    "created_at" timestamptz  NOT NULL,
    "updated_at" timestamptz  NULL,
    "key"        VARCHAR(255) NOT NULL,
    "title"      VARCHAR(255) NOT NULL
);
ALTER TABLE "exhibition"
    ADD CONSTRAINT "exhibition_key_unique" UNIQUE ("key");

INSERT INTO exhibition (id, created_at, updated_at, key, title)
VALUES (1, NOW(), NOW(), 'cc2025', 'Classic Computing 2025');

CREATE TABLE "exhibitor"
(
    "id"            SERIAL PRIMARY KEY,
    "created_at"    timestamptz NOT NULL,
    "updated_at"    timestamptz NULL,
    "exhibition_id" INT         NOT NULL,
    "user_id"       INT         NOT NULL
);

ALTER TABLE "exhibitor"
    ADD CONSTRAINT "exhibitor_exhibition_id_foreign" FOREIGN KEY ("exhibition_id") REFERENCES "exhibition" ("id") ON UPDATE CASCADE;
ALTER TABLE "exhibitor"
    ADD CONSTRAINT "exhibitor_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON UPDATE CASCADE;

INSERT INTO exhibitor (id, created_at, exhibition_id, user_id)
SELECT id, NOW(), 1, id
FROM "user";

ALTER TABLE "table"
    DROP CONSTRAINT "table_exhibitor_id_foreign";

ALTER TABLE "exhibit"
    DROP CONSTRAINT "exhibit_exhibitor_id_foreign";

DROP INDEX "registration_event_id_index";
ALTER TABLE "registration"
    DROP CONSTRAINT "registration_event_id_email_unique";
ALTER TABLE "registration"
    DROP COLUMN "event_id";

ALTER TABLE "registration"
    ADD COLUMN "exhibition_id" INT NULL;
UPDATE "registration"
SET exhibition_id = 1;
ALTER TABLE "registration"
    ALTER exhibition_id SET NOT NULL;

ALTER TABLE "registration"
    ADD CONSTRAINT "registration_exhibition_id_foreign" FOREIGN KEY ("exhibition_id") REFERENCES "exhibition" ("id") ON UPDATE CASCADE;
ALTER TABLE "registration"
    ADD CONSTRAINT "registration_exhibition_id_email_unique" UNIQUE ("exhibition_id", "email");

ALTER TABLE "table"
    ADD COLUMN "exhibition_id" INT NULL,
    ADD COLUMN "number"        INT NULL;
UPDATE "table"
SET exhibition_id = 1;
UPDATE "table"
SET number = id;
ALTER TABLE "table"
    ALTER exhibition_id SET NOT NULL;
ALTER TABLE "table"
    ALTER number SET NOT NULL;

ALTER TABLE "table"
    ADD CONSTRAINT "table_exhibition_id_foreign" FOREIGN KEY ("exhibition_id") REFERENCES "exhibition" ("id") ON UPDATE CASCADE;
ALTER TABLE "table"
    ADD CONSTRAINT "table_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "table"
    ADD CONSTRAINT "table_exhibition_id_number_unique" UNIQUE ("exhibition_id", "number");

ALTER TABLE "exhibit"
    ADD COLUMN "exhibition_id" INT NULL;
UPDATE exhibit
SET exhibition_id = 1;
ALTER TABLE "exhibit"
    ALTER exhibition_id SET NOT NULL;
ALTER TABLE "exhibit"
    ADD CONSTRAINT "exhibit_exhibition_id_foreign" FOREIGN KEY ("exhibition_id") REFERENCES "exhibition" ("id") ON UPDATE CASCADE;
ALTER TABLE "exhibit"
    ADD CONSTRAINT "exhibit_exhibitor_id_foreign" FOREIGN KEY ("exhibitor_id") REFERENCES "exhibitor" ("id") ON UPDATE CASCADE;
`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "registration" drop constraint "registration_exhibition_id_foreign";`,
    )

    this.addSql(
      `alter table "exhibitor" drop constraint "exhibitor_exhibition_id_foreign";`,
    )

    this.addSql(
      `alter table "table" drop constraint "table_exhibition_id_foreign";`,
    )

    this.addSql(
      `alter table "exhibit" drop constraint "exhibit_exhibition_id_foreign";`,
    )

    this.addSql(
      `alter table "table" drop constraint "table_exhibitor_id_foreign";`,
    )

    this.addSql(
      `alter table "exhibit" drop constraint "exhibit_exhibitor_id_foreign";`,
    )

    this.addSql(`drop table if exists "exhibition" cascade;`)

    this.addSql(`drop table if exists "exhibitor" cascade;`)

    this.addSql(
      `alter table "table" drop constraint "table_exhibitor_id_foreign";`,
    )

    this.addSql(
      `alter table "exhibit" drop constraint "exhibit_exhibitor_id_foreign";`,
    )

    this.addSql(
      `alter table "registration" drop constraint "registration_exhibition_id_email_unique";`,
    )
    this.addSql(`alter table "registration" drop column "exhibition_id";`)

    this.addSql(
      `alter table "registration" add column "event_id" varchar(255) null;`,
    )
    this.addSql(`update registration set event_id = 'cc2025';`)
    this.addSql(
      `alter table "registration" alter column "event_id" set not null;`,
    )
    this.addSql(
      `create index "registration_event_id_index" on "registration" ("event_id");`,
    )
    this.addSql(
      `alter table "registration" add constraint "registration_event_id_email_unique" unique ("event_id", "email");`,
    )

    this.addSql(
      `alter table "table" drop constraint "table_exhibition_id_number_unique";`,
    )
    this.addSql(
      `alter table "table" drop column "exhibition_id", drop column "number";`,
    )

    this.addSql(
      `alter table "table" add constraint "table_exhibitor_id_foreign" foreign key ("exhibitor_id") references "user" ("id") on update cascade on delete set null;`,
    )

    this.addSql(`alter table "exhibit" drop column "exhibition_id";`)

    this.addSql(
      `alter table "exhibit" add constraint "exhibit_exhibitor_id_foreign" foreign key ("exhibitor_id") references "user" ("id") on update cascade;`,
    )
  }
}
