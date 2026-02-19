import {
  Repository,
  FindOptionsWhere,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
  ObjectLiteral,
} from 'typeorm';
import { IBaseRepository } from './base.repository.interface';

/**
 * Base Repository Implementation
 * Provides common database operations for all entities
 */
export abstract class BaseRepository<T extends ObjectLiteral>
  implements IBaseRepository<T>
{
  constructor(protected readonly repository: Repository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const entity = this.repository.create(data as DeepPartial<T>);
    return this.repository.save(entity);
  }

  async createMany(data: Partial<T>[]): Promise<T[]> {
    const entities = this.repository.create(data as DeepPartial<T>[]);
    return this.repository.save(entities);
  }

  async findById(id: string | number): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findBy(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.findBy(where);
  }

  async update(id: string | number, data: Partial<T>): Promise<T | null> {
    await this.repository.update(
      { id } as unknown as FindOptionsWhere<T>,
      data as any,
    );
    return this.findById(id);
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await this.repository.delete(
      { id } as unknown as FindOptionsWhere<T>,
    );
    return (result.affected ?? 0) > 0;
  }

  async softDelete(id: string | number): Promise<boolean> {
    const result = await this.repository.softDelete({
      id,
    } as unknown as FindOptionsWhere<T>);
    return (result.affected ?? 0) > 0;
  }

  async count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repository.count({ where });
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async save(data: Partial<T>): Promise<T> {
    return this.repository.save(data as DeepPartial<T>);
  }

  async saveMany(data: Partial<T>[]): Promise<T[]> {
    return this.repository.save(data as DeepPartial<T>[]);
  }
}
