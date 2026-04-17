import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrencyToInstitute1770400000000 implements MigrationInterface {
  name = 'AddCurrencyToInstitute1770400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "currency" character varying(10) NOT NULL DEFAULT 'USD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutes" DROP COLUMN IF EXISTS "currency"`,
    );
  }
}
