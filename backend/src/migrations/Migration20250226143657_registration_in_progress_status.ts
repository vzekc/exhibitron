import { Migration } from '@mikro-orm/migrations'

export class Migration20250226143657_registration_in_progress_status extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter type "registration_status" add value if not exists 'inProgress' after 'new';`,
    )
  }
}
