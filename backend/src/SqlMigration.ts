import { Migration } from '@mikro-orm/migrations'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { statSync } from 'node:fs'

export abstract class SqlMigration extends Migration {
  abstract url(): string

  makeMigrationFilename(extension: string): string {
    const tsPath = fileURLToPath(this.url())
    if (!tsPath.endsWith('.ts')) {
      throw new Error(`Expected .ts file, got ${tsPath}`)
    }
    return tsPath.replace('.ts', extension)
  }

  override async up(): Promise<void> {
    const sql = readFileSync(this.makeMigrationFilename('.sql'), 'utf8')
    this.addSql(sql)
  }

  override async down(): Promise<void> {
    const downSqlPath = this.makeMigrationFilename('.down.sql')
    if (statSync(downSqlPath, { throwIfNoEntry: false })) {
      const sql = readFileSync(downSqlPath, 'utf8')
      this.addSql(sql)
    } else {
      // If no down migration exists, do nothing
      this.addSql('select 1')
    }
  }
}
