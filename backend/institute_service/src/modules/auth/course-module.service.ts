import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CourseModuleRepository,
  CourseRepository,
} from '../../infra/database/repositories';
import { ModuleContentRepository } from '../../infra/database/repositories/module-content.repository';
import { VoiceAgentClient } from '../../infra/http/voice-agent.client';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CourseModule } from './entities/course-module.entity';
import { ContentType } from './entities/module-content.entity';

const INDEXABLE_TYPES: ContentType[] = [ContentType.PDF, ContentType.DOCUMENT];

function isIndexable(
  type: ContentType,
  url: string | undefined | null,
): boolean {
  return INDEXABLE_TYPES.includes(type) && !!url;
}

@Injectable()
export class CourseModuleService {
  private readonly logger = new Logger(CourseModuleService.name);

  constructor(
    private readonly courseModuleRepository: CourseModuleRepository,
    private readonly courseRepository: CourseRepository,
    private readonly moduleContentRepository: ModuleContentRepository,
    private readonly voiceAgentClient: VoiceAgentClient,
  ) {}

  async createModule(
    instituteId: string,
    courseId: string,
    createDto: CreateCourseModuleDto,
  ): Promise<CourseModule> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instituteId } as any,
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const newModule = await this.courseModuleRepository.create({
      ...createDto,
      courseId,
    });

    return newModule;
  }

  async getModulesByCourseId(
    instituteId: string,
    courseId: string,
  ): Promise<CourseModule[]> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instituteId } as any,
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return this.courseModuleRepository.findByCourseId(courseId);
  }

  async getModuleById(
    instituteId: string,
    courseId: string,
    moduleId: string,
  ): Promise<CourseModule> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instituteId } as any,
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const module = await this.courseModuleRepository.findOne({
      where: { id: moduleId, courseId } as any,
    });
    if (!module) {
      throw new NotFoundException('Course module not found');
    }
    return module;
  }

  async updateModule(
    instituteId: string,
    courseId: string,
    moduleId: string,
    updateDto: UpdateCourseModuleDto,
  ): Promise<CourseModule> {
    const module = await this.getModuleById(instituteId, courseId, moduleId);

    Object.assign(module, updateDto);
    return this.courseModuleRepository.save(module);
  }

  async deleteModule(
    instituteId: string,
    courseId: string,
    moduleId: string,
  ): Promise<{ message: string }> {
    const module = await this.getModuleById(instituteId, courseId, moduleId);

    // Fetch indexable contents before cascade-delete removes them from DB
    const contents =
      await this.moduleContentRepository.findByModuleId(moduleId);

    await this.courseModuleRepository.delete(module.id);

    // Clean up Qdrant vectors for any indexed content in this module
    for (const content of contents) {
      if (isIndexable(content.type, content.url)) {
        this.voiceAgentClient
          .deleteContent(instituteId, courseId, content.id)
          .catch((err) =>
            this.logger.error(
              `KB delete failed for content ${content.id} on module delete: ${err}`,
            ),
          );
      }
    }

    return { message: 'Course module deleted successfully' };
  }
}
