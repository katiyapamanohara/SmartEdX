import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntegrityFlagsToModuleContent1774900000000
  implements MigrationInterface
{
  name = 'AddIntegrityFlagsToModuleContent1774900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add integrityFlags JSONB column to module_contents.
    // Stores per-student proctoring violation records:
    // { [userId]: [{ id, type, severity, timestamp, detail, reviewed }] }
    await queryRunner.query(
      `ALTER TABLE "module_contents"
       ADD COLUMN IF NOT EXISTS "integrityFlags" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "module_contents"
       DROP COLUMN IF EXISTS "integrityFlags"`,
    );
  }
}
