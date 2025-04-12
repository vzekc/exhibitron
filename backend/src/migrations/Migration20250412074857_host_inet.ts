import { SqlMigration } from '../SqlMigration.js'

export class Migration20250412074857_host_inet extends SqlMigration {
  override url() {
    return import.meta.url
  }
}
