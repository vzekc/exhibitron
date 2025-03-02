import { Migration } from '@mikro-orm/migrations'

export class Migration20250302081653_fix_typo extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "user" rename column "pasword_reset_token_expires" to "password_reset_token_expires";`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "user" rename column "password_reset_token_expires" to "pasword_reset_token_expires";`,
    )
  }
}
