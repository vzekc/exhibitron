import { Migration } from '@mikro-orm/migrations'

/*
 * The attributes that stand on every data sheet, in the order they are shown.
 * The first set is the dozen that most exhibits already carry.
 */
const STANDARD = [
  'Hersteller',
  'Markteinführung',
  'Land',
  'Preis',
  'Architektur',
  'CPU',
  'Systemtakt',
  'RAM',
  'ROM',
  'Grafik',
  'Sound',
  'Betriebssystem',
]

export class Migration20260921150000_standard_exhibit_attributes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibit_attribute" add column "standard_order" int null;`)
    STANDARD.forEach((name, position) => {
      this.addSql(
        `update "exhibit_attribute" set "standard_order" = ${position} where "name" = '${name}';`,
      )
    })
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "exhibit_attribute" drop column "standard_order";`)
  }
}
