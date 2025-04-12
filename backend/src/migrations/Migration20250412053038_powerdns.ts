import { Migration } from '@mikro-orm/migrations'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

export class Migration20250412053038_powerdns extends Migration {
  override async up(): Promise<void> {
    const currentFile = fileURLToPath(import.meta.url)
    const sqlPath = currentFile.replace('.ts', '.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    this.addSql(sql)
  }

  override async down(): Promise<void> {
    this.addSql(`drop schema dns cascade;`)
  }
}
