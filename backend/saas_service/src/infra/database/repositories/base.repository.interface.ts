import { FindOptionsWhere, FindOneOptions, FindManyOptions } from 'typeorm';

/**
 * Generic Repository Interface
 * Defines common database operations for all entities
 */
export interface IBaseRepository<T> {
  /**
   * Create a new entity
   * @param data - Entity data
   * @returns Created entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Create multiple entities
   * @param data - Array of entity data
   * @returns Array of created entities
   */
  createMany(data: Partial<T>[]): Promise<T[]>;

  /**
   * Find entity by ID
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  findById(id: string | number): Promise<T | null>;

  /**
   * Find one entity by conditions
   * @param options - Find options
   * @returns Entity or null if not found
   */
  findOne(options: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find all entities matching conditions
   * @param options - Find options
   * @returns Array of entities
   */
  findAll(options?: FindManyOptions<T>): Promise<T[]>;

  /**
   * Find entities by specific conditions
   * @param where - Where conditions
   * @returns Array of entities
   */
  findBy(where: FindOptionsWhere<T>): Promise<T[]>;

  /**
   * Update entity by ID
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity or null if not found
   */
  update(id: string | number, data: Partial<T>): Promise<T | null>;

  /**
   * Delete entity by ID
   * @param id - Entity ID
   * @returns True if deleted, false if not found
   */
  delete(id: string | number): Promise<boolean>;

  /**
   * Soft delete entity by ID (if entity has soft delete)
   * @param id - Entity ID
   * @returns True if deleted, false if not found
   */
  softDelete(id: string | number): Promise<boolean>;

  /**
   * Count entities matching conditions
   * @param where - Where conditions
   * @returns Number of entities
   */
  count(where?: FindOptionsWhere<T>): Promise<number>;

  /**
   * Check if entity exists
   * @param where - Where conditions
   * @returns True if exists
   */
  exists(where: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Save entity (create or update)
   * @param data - Entity data
   * @returns Saved entity
   */
  save(data: Partial<T>): Promise<T>;

  /**
   * Save multiple entities
   * @param data - Array of entity data
   * @returns Array of saved entities
   */
  saveMany(data: Partial<T>[]): Promise<T[]>;
}
