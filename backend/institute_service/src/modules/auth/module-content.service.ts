import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleContentRepository } from '../../infra/database/repositories/module-content.repository';
import { CourseModuleRepository } from '../../infra/database/repositories/course-module.repository';
import { CreateModuleContentDto } from './dto/create-module-content.dto';
import { UpdateModuleContentDto } from './dto/update-module-content.dto';
import { ModuleContent } from './entities/module-content.entity';

@Injectable()
export class ModuleContentService {
  constructor(
    private readonly moduleContentRepository: ModuleContentRepository,
    private readonly courseModuleRepository: CourseModuleRepository,
  ) {}

  async create(courseId: string, moduleId: string, createDto: CreateModuleContentDto): Promise<ModuleContent> {
    // Verify module exists and belongs to the specified course
    const module = await this.courseModuleRepository.findById(moduleId);
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException(`Valid course module with ID ${moduleId} not found`);
    }

    // Set order to the next available position if not provided
    let { order } = createDto;
    if (order === undefined) {
      const existingContents = await this.moduleContentRepository.findByModuleId(moduleId);
      order = existingContents.length;
    }

    return this.moduleContentRepository.create({
      ...createDto,
      moduleId,
      order,
    });
  }

  async findAllByModuleId(courseId: string, moduleId: string): Promise<ModuleContent[]> {
    // Verify module exists
    const module = await this.courseModuleRepository.findById(moduleId);
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException(`Valid course module with ID ${moduleId} not found`);
    }

    return await this.moduleContentRepository.findByModuleId(moduleId);
  }

  async findOne(courseId: string, moduleId: string, id: string): Promise<ModuleContent> {
    // Verify module exists
    const module = await this.courseModuleRepository.findById(moduleId);
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException(`Valid course module with ID ${moduleId} not found`);
    }

    const content = await this.moduleContentRepository.findById(id);
    if (!content || content.moduleId !== moduleId) {
      throw new NotFoundException(`Module content with ID ${id} not found in module ${moduleId}`);
    }
    return content;
  }

  async update(courseId: string, moduleId: string, id: string, updateDto: UpdateModuleContentDto): Promise<ModuleContent> {
    // Verify content exists
    const existing = await this.findOne(courseId, moduleId, id);
    
    return await this.moduleContentRepository.update(existing.id, updateDto as Partial<ModuleContent>) as ModuleContent;
  }

  async remove(courseId: string, moduleId: string, id: string): Promise<void> {
    const content = await this.findOne(courseId, moduleId, id);
    await this.moduleContentRepository.delete(content.id);
  }
}
