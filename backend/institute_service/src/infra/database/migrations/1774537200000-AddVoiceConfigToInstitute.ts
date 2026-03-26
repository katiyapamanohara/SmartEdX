import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoiceConfigToInstitute1774537200000 implements MigrationInterface {
    name = 'AddVoiceConfigToInstitute1774537200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "voiceInstructions" text`);
        await queryRunner.query(`ALTER TABLE "institutes" ADD COLUMN IF NOT EXISTS "voiceGreeting" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institutes" DROP COLUMN IF EXISTS "voiceGreeting"`);
        await queryRunner.query(`ALTER TABLE "institutes" DROP COLUMN IF EXISTS "voiceInstructions"`);
    }
}
