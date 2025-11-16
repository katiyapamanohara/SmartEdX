import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRoleIdType1763321222216 implements MigrationInterface {
    name = 'FixRoleIdType1763321222216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "PK_703705ba862c2bb45250962c9e1"`);
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "role" ADD "roleId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "PK_703705ba862c2bb45250962c9e1" PRIMARY KEY ("roleId")`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "roleId" uuid`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("roleId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "roleId" integer`);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "PK_703705ba862c2bb45250962c9e1"`);
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "role" ADD "roleId" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "PK_703705ba862c2bb45250962c9e1" PRIMARY KEY ("roleId")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("roleId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
