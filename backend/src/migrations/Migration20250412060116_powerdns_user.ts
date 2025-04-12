import { SqlMigration } from '../SqlMigration.js'

export class Migration20250412060116_powerdns_user extends SqlMigration {
  override url() {
    return import.meta.url
  }
}
