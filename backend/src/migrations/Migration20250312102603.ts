import { Migration } from '@mikro-orm/migrations';

export class Migration20250312102603 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "exhibit" drop constraint "exhibit_table_id_unique";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit" add constraint "exhibit_table_id_unique" unique ("table_id");`);
  }

}
