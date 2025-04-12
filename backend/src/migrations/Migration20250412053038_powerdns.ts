import { SqlMigration } from '../SqlMigration.js'

export class Migration20250412053038_powerdns extends SqlMigration {
  override url(): string {
    return import.meta.url
  }

  override async down(): Promise<void> {
    this.addSql(`drop schema if exists dns cascade;`)
  }
}
