import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTables1770311127073 implements MigrationInterface {
  name = 'RenameTables1770311127073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roles" RENAME TO "sass_roles"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME TO "sass_users"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sass_users" RENAME TO "users"`);
    await queryRunner.query(`ALTER TABLE "sass_roles" RENAME TO "roles"`);
  }
}
