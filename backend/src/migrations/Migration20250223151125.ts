import { Migration } from '@mikro-orm/migrations'

export class Migration20250223151125 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "registration" alter column "nickname" type varchar(255) using ("nickname"::varchar(255));`,
    )
    this.addSql(
      `alter table "registration" alter column "nickname" drop not null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "registration" alter column "nickname" type varchar(255) using ("nickname"::varchar(255));`,
    )
    this.addSql(
      `alter table "registration" alter column "nickname" set not null;`,
    )
  }
}
