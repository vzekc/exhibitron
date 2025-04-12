import { SqlMigration } from '../SqlMigration.js'

export class Migration20250412061128_powerdns_zones extends SqlMigration {
  override url() {
    return import.meta.url
  }
}
