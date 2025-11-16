import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'role',
})
export class RoleEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid') 
  roleId: string;

  @Column()
  name?: string;
}
  