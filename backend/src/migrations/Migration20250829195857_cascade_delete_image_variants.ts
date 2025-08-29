import { SqlMigration } from '../SqlMigration.js'

export class Migration20250829195857_cascade_delete_image_variants extends SqlMigration {
  override url() {
    return import.meta.url
  }
}
