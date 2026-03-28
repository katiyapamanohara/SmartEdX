import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleContentRepository } from '../../infra/database/repositories/module-content.repository';
import { CourseModuleRepository } from '../../infra/database/repositories/course-module.repository';
import { CourseRepository } from '../../infra/database/repositories/course.repository';
import { MinioService } from '../../infra/storage/minio.service';
import { VoiceAgentClient } from '../../infra/http/voice-agent.client';
import { CreateModuleContentDto } from './dto/create-module-content.dto';
import { UpdateModuleContentDto } from './dto/update-module-content.dto';
import { ModuleContent, ContentType } from './entities/module-content.entity';

/** Content types that carry indexable text for the course knowledge base. */
const INDEXABLE_TYPES: ContentType[] = [ContentType.PDF, ContentType.DOCUMENT];

function isIndexable(type: ContentType, url: string | undefined | null): boolean {
  return INDEXABLE_TYPES.includes(type) && !!url;
}

@Injectable()
export class ModuleContentService {
  private readonly logger = new Logger(ModuleContentService.name);

  constructor(
    private readonly moduleContentRepository: ModuleContentRepository,
    private readonly courseModuleRepository: CourseModuleRepository,
    private readonly courseRepository: CourseRepository,
    private readonly minioService: MinioService,
    private readonly voiceAgentClient: VoiceAgentClient,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(courseId: string, moduleId: string, createDto: CreateModuleContentDto): Promise<ModuleContent> {
    const module = await this.courseModuleRepository.findById(moduleId);
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException(`Valid course module with ID ${moduleId} not found`);
    }

    let { order } = createDto;
    if (order === undefined) {
      const existingContents = await this.moduleContentRepository.findByModuleId(moduleId);
      order = existingContents.length;
    }

    const content = await this.moduleContentRepository.create({ ...createDto, moduleId, order });

    // Index PDF / Word documents added directly via URL (not via file upload)
    if (isIndexable(content.type, content.url)) {
      this.queueKbIndex(courseId, content).catch((err) =>
        this.logger.error(`KB index failed for content ${content.id}: ${err}`),
      );
    }

    return content;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAllByModuleId(courseId: string, moduleId: string): Promise<ModuleContent[]> {
    const module = await this.courseModuleRepository.findById(moduleId);
    if (!module || module.courseId !== courseId) {
      throw new NotFoundException(`Valid course module with ID ${moduleId} not found`);
    }
    return this.moduleContentRepository.findByModuleId(moduleId);
  }

  async findOne(courseId: string, moduleId: string, id: string): Promise<ModuleContent> {
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

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    courseId: string,
    moduleId: string,
    id: string,
    updateDto: UpdateModuleContentDto,
  ): Promise<ModuleContent> {
    const existing = await this.findOne(courseId, moduleId, id);

    const updated = await this.moduleContentRepository.update(
      existing.id,
      updateDto as Partial<ModuleContent>,
    ) as ModuleContent;

    const wasIndexable = isIndexable(existing.type, existing.url);
    const newType      = updated.type ?? existing.type;
    const newUrl       = updated.url  ?? existing.url;
    const nowIndexable = isIndexable(newType, newUrl);

    const urlChanged  = updateDto.url  !== undefined && updateDto.url  !== existing.url;
    const typeChanged = updateDto.type !== undefined && updateDto.type !== existing.type;

    if (nowIndexable && (urlChanged || typeChanged)) {
      this.queueKbIndex(courseId, updated).catch((err) =>
        this.logger.error(`KB re-index failed for content ${updated.id}: ${err}`),
      );
    } else if (wasIndexable && !nowIndexable) {
      // No longer a PDF/DOCUMENT — remove from index
      this._deleteFromKb(courseId, existing.id).catch((err) =>
        this.logger.error(`KB delete failed for content ${existing.id}: ${err}`),
      );
    }

    return updated;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(courseId: string, moduleId: string, id: string): Promise<void> {
    const content = await this.findOne(courseId, moduleId, id);
    await this.moduleContentRepository.delete(content.id);

    if (isIndexable(content.type, content.url)) {
      this._deleteFromKb(courseId, content.id).catch((err) =>
        this.logger.error(`KB delete failed for content ${content.id}: ${err}`),
      );
    }
  }

  // ── File upload (institute admin) ─────────────────────────────────────────

  async createWithFileUpload(
    courseId: string,
    moduleId: string,
    file: Express.Multer.File,
    body: any,
  ): Promise<ModuleContent> {
    const type = body.type as ContentType;
    const bucket =
      type === ContentType.PDF    ? 'pdfs'      :
      type === ContentType.VIDEO  ? 'videos'    :
      'documents';

    const url = await this.minioService.uploadFile(file, bucket);

    // `create()` will automatically trigger KB indexing for PDF/DOCUMENT types
    return this.create(courseId, moduleId, {
      title:       body.title,
      description: body.description,
      type,
      url,
      order: body.order !== undefined ? parseInt(body.order) : undefined,
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Look up the course (to get instituteId + name) and call the voice agent
   * to index the content into the course's dedicated Qdrant collection.
   * Runs asynchronously — caller should .catch() any errors.
   */
  async queueKbIndex(courseId: string, content: ModuleContent): Promise<void> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      this.logger.warn(`queueKbIndex: course ${courseId} not found, skipping KB index`);
      return;
    }

    await this.voiceAgentClient.indexContent({
      institute_id: course.instituteId,
      course_id:    courseId,
      course_name:  course.name,
      content_id:   content.id,
      file_url:     content.url,
      file_type:    content.type,
      title:        content.title,
    });
  }

  /**
   * Look up the course to get its instituteId, then delete the content from
   * the course's dedicated Qdrant collection.
   */
  private async _deleteFromKb(courseId: string, contentId: string): Promise<void> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      this.logger.warn(`_deleteFromKb: course ${courseId} not found, skipping KB delete`);
      return;
    }
    await this.voiceAgentClient.deleteContent(course.instituteId, courseId, contentId);
  }
}
