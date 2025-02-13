import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1739428407732 implements MigrationInterface {
  name = 'Migrations1739428407732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "table"
                             (
                                 "number"  INTEGER NOT NULL,
                                 "ownerId" uuid,
                                 CONSTRAINT "PK_54d68e5dfeea1244c6642cd77f5" PRIMARY KEY ("number")
                             )`);
    await queryRunner.query(`CREATE TABLE "exhibition"
                             (
                                 "id"                uuid              NOT NULL DEFAULT uuid_generate_v4(),
                                 "title"             CHARACTER VARYING NOT NULL,
                                 "description"       CHARACTER VARYING NOT NULL DEFAULT '',
                                 "exhibitorId"       uuid,
                                 "tableNumberNumber" INTEGER,
                                 CONSTRAINT "PK_ddc3afc8e0b4daf3b68d51c31f4" PRIMARY KEY ("id")
                             )`);
    await queryRunner.query(`CREATE TABLE "user"
                             (
                                 "id"                            uuid              NOT NULL DEFAULT uuid_generate_v4(),
                                 "name"                          CHARACTER VARYING NOT NULL,
                                 "password_hash"                 CHARACTER VARYING,
                                 "password_reset_key"            CHARACTER VARYING,
                                 "password_reset_key_expires_at" TIMESTAMP,
                                 "is_administrator"              BOOLEAN           NOT NULL DEFAULT FALSE,
                                 CONSTRAINT "UQ_065d4d8f3b5adb4a08841eae3c8" UNIQUE ("name"),
                                 CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
                             )`);
    await queryRunner.query(`ALTER TABLE "table"
        ADD CONSTRAINT "FK_709d31ef6489352d3c366469099" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "exhibition"
        ADD CONSTRAINT "FK_7210ee8c5983aa6e96cc5386064" FOREIGN KEY ("exhibitorId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "exhibition"
        ADD CONSTRAINT "FK_13a163d2ebc4b9c64a894351de7" FOREIGN KEY ("tableNumberNumber") REFERENCES "table" ("number") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exhibition"
        DROP CONSTRAINT "FK_13a163d2ebc4b9c64a894351de7"`);
    await queryRunner.query(`ALTER TABLE "exhibition"
        DROP CONSTRAINT "FK_7210ee8c5983aa6e96cc5386064"`);
    await queryRunner.query(`ALTER TABLE "table"
        DROP CONSTRAINT "FK_709d31ef6489352d3c366469099"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "exhibition"`);
    await queryRunner.query(`DROP TABLE "table"`);
  }
}
