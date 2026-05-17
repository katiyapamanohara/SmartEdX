import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitCourseAgentInstructions1774810000000
  implements MigrationInterface
{
  name = 'SplitCourseAgentInstructions1774810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the generic column added by the previous migration (if still present)
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
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "agentInstructions" text`,
    );
  }
}
