import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedAdminUser1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const saltRounds = 10;

    // Hash passwords
    const adminPassword = await bcrypt.hash('Admin@123', saltRounds);
    const instructorPassword = await bcrypt.hash('Instructor@123', saltRounds);
    const studentPassword = await bcrypt.hash('Student@123', saltRounds);

    // Insert seed users
    await queryRunner.query(`
      INSERT INTO users (id, "firstName", "lastName", email, password, role, "isActive", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          'System',
          'Administrator',
          'admin@example.com',
          '${adminPassword}',
          'admin',
          true,
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          'John',
          'Instructor',
          'instructor@example.com',
          '${instructorPassword}',
          'instructor',
          true,
          NOW(),
          NOW()
        ),
        (
          gen_random_uuid(),
          'Jane',
          'Student',
          'student@example.com',
          '${studentPassword}',
          'student',
          true,
          NOW(),
          NOW()
        )
      ON CONFLICT (email) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM users
      WHERE email IN ('admin@example.com', 'instructor@example.com', 'student@example.com');
    `);
  }
}
