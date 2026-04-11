import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateRolesTableAndUpdateUsers1700000000002
  implements MigrationInterface
{
  name = 'CreateRolesTableAndUpdateUsers1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Insert default roles
    await queryRunner.query(`
      INSERT INTO roles (id, name, description) VALUES
      (uuid_generate_v4(), 'admin', 'Administrator with full system access'),
      (uuid_generate_v4(), 'instructor', 'Instructor who can create and manage courses'),
      (uuid_generate_v4(), 'student', 'Student who can enroll in courses and take quizzes')
    `);

    // Add roleId column to users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN "roleId" uuid
    `);

    // Migrate existing role enum data to roleId
    await queryRunner.query(`
      UPDATE users 
      SET "roleId" = (SELECT id FROM roles WHERE name = users.role::text)
    `);

    // Make roleId not nullable
    await queryRunner.query(`
      ALTER TABLE users ALTER COLUMN "roleId" SET NOT NULL
    `);

    // Drop old role enum column
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN role
    `);

    // Create foreign key
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_USER_ROLE',
        columnNames: ['roleId'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Create index on roleId for faster lookups
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_ROLE_ID',
        columnNames: ['roleId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('users', 'IDX_USER_ROLE_ID');

    // Drop foreign key
    await queryRunner.dropForeignKey('users', 'FK_USER_ROLE');

    // Add back role enum column
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN role varchar
    `);

    // Migrate roleId back to role enum
    await queryRunner.query(`
      UPDATE users 
      SET role = (SELECT name FROM roles WHERE id = users."roleId")
    `);

    // Drop roleId column
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN "roleId"
    `);

    // Recreate role enum type and set column type
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM ('admin', 'instructor', 'student')
    `);

    await queryRunner.query(`
      ALTER TABLE users ALTER COLUMN role TYPE user_role_enum USING role::user_role_enum
    `);

    await queryRunner.query(`
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'student'
    `);

    // Drop roles table
    await queryRunner.dropTable('roles');
  }
}
