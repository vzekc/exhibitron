import { Migration } from '@mikro-orm/migrations'

export class Migration20250313163621_page_text_colum extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "page" alter column "text" type text using ("text"::text);`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "page" alter column "text" type varchar(255) using ("text"::varchar(255));`,
    )
  }
}
