import { Migration } from '@mikro-orm/migrations'

export class Migration20250328055332_exhibitor_topic extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "exhibitor" add column "topic" varchar(255) null;`)

    // Data migration: For exhibitors with only one exhibit that has null description_id,
    // set the exhibitor.topic to the title of that exhibit and delete the exhibit
    this.addSql(`
      WITH single_exhibit_exhibitors AS (
        SELECT er.id AS exhibitor_id,
               u.id AS user_id,
               u.full_name,
               u.nickname,
               e.id AS exhibit_id
        FROM exhibitor er
               JOIN "user" u ON er.user_id = u.id
               JOIN exhibit e ON er.id = e.exhibitor_id
               LEFT JOIN exhibit_image ei ON e.id = ei.exhibit_id
        GROUP BY er.id, u.id, u.full_name, u.nickname, e.id
        HAVING COUNT(e.id) = 1
           AND COUNT(ei.id) = 0
      )
      UPDATE
        "exhibitor" ex
      SET
        "topic" = e.title
      FROM
        single_exhibit_exhibitors see
      JOIN
        "exhibit" e ON e.id = see.exhibit_id
      WHERE
        ex.id = see.exhibitor_id
        AND e.description_id IS NULL;
    `)

    // Delete the exhibits that have been migrated
    this.addSql(`
      DELETE FROM
        "exhibit" e
      USING
        "exhibitor" ex
      WHERE
        e.exhibitor_id = ex.id
        AND ex.topic = e.title
        AND e.description_id IS NULL
        AND (
          SELECT COUNT(*)
          FROM "exhibit"
          WHERE exhibitor_id = ex.id
        ) = 1;
    `)
  }

  override async down(): Promise<void> {
    // We cannot restore the deleted exhibits when rolling back
    this.addSql(`alter table "exhibitor" drop column "topic";`)
  }
}
