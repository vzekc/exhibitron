import { Migration } from '@mikro-orm/migrations'

/*
 * A nickname is a forum name or nothing. Rows that hold a blank string, or
 * one padded with whitespace, are brought to that rule so that approving a
 * registration without a nickname does not create a user whose empty
 * nickname collides with another's.
 */
export class Migration20260921090000_blank_nickname_is_null extends Migration {
  override async up(): Promise<void> {
    for (const table of ['user', 'registration']) {
      this.addSql(
        `update "${table}" set "nickname" = nullif(trim("nickname"), '') where "nickname" <> trim("nickname") or "nickname" = '';`,
      )
    }
  }

  override async down(): Promise<void> {}
}
