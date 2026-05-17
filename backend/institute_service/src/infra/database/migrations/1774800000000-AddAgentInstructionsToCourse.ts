import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentInstructionsToCourse1774800000000
  implements MigrationInterface
{
  name = 'AddAgentInstructionsToCourse1774800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old generic column if it exists from a previous run
    await queryRunner.query(
      `ALTER TABLE "courses" DROP COLUMN IF EXISTS "agentInstructions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "studentAgentInstructions" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "teacherAgentInstructions" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" DROP COLUMN IF EXISTS "teacherAgentInstructions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP COLUMN IF EXISTS "studentAgentInstructions"`,
    );
  }
}
