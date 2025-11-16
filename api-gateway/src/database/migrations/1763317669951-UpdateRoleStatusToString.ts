import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRoleStatusToString1763317669951 implements MigrationInterface {
    name = 'UpdateRoleStatusToString1763317669951'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_dc18daa696860586ba4667a9d31"`);
        
        // Step 2: Clear existing data and recreate role table with string IDs
        await queryRunner.query(`DELETE FROM "user"`);
        await queryRunner.query(`DELETE FROM "role"`);
        await queryRunner.query(`DELETE FROM "status"`);
        
        // Step 3: Update role table structure
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2"`);
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "role" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id")`);
        
        // Step 4: Update status table structure
        await queryRunner.query(`ALTER TABLE "status" DROP CONSTRAINT "PK_e12743a7086ec826733f54e1d95"`);
        await queryRunner.query(`ALTER TABLE "status" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "status" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "status" ADD CONSTRAINT "PK_e12743a7086ec826733f54e1d95" PRIMARY KEY ("id")`);
        
        // Step 5: Update user table foreign key columns
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "roleId" character varying`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "statusId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "statusId" character varying`);
        
        // Step 6: Insert the new string-based role and status data
        await queryRunner.query(`INSERT INTO "role"("id", "name") VALUES ('admin', 'Admin')`);
        await queryRunner.query(`INSERT INTO "role"("id", "name") VALUES ('user', 'User')`);
        await queryRunner.query(`INSERT INTO "status"("id", "name") VALUES ('active', 'Active')`);
        await queryRunner.query(`INSERT INTO "status"("id", "name") VALUES ('inactive', 'Inactive')`);
        
        // Step 7: Recreate foreign key constraints
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_dc18daa696860586ba4667a9d31" FOREIGN KEY ("statusId") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_dc18daa696860586ba4667a9d31"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "statusId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "statusId" integer`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "roleId"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "roleId" integer`);
        await queryRunner.query(`ALTER TABLE "status" DROP CONSTRAINT "PK_e12743a7086ec826733f54e1d95"`);
        await queryRunner.query(`ALTER TABLE "status" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "status" ADD "id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "status" ADD CONSTRAINT "PK_e12743a7086ec826733f54e1d95" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_dc18daa696860586ba4667a9d31" FOREIGN KEY ("statusId") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2"`);
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "role" ADD "id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
