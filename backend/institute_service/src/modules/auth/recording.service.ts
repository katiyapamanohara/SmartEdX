import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RecordingRepository } from '../../infra/database/repositories/recording.repository';
import { RecordingCategoryRepository } from '../../infra/database/repositories/recording-category.repository';
import { RecordingCourseAssignmentRepository } from '../../infra/database/repositories/recording-course-assignment.repository';
import { MinioService } from '../../infra/storage/minio.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { AssignRecordingDto } from './dto/assign-recording.dto';
import { CreateRecordingCategoryDto } from './dto/create-recording-category.dto';

@Injectable()
export class RecordingService {
  constructor(
    private readonly recordingRepo: RecordingRepository,
    private readonly categoryRepo: RecordingCategoryRepository,
    private readonly assignmentRepo: RecordingCourseAssignmentRepository,
    private readonly minioService: MinioService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private mapAssignment(a: any) {
    const isActive = new Date(a.deadline) > new Date();
    return {
      id: a.id,
      courseId: a.course?.id ?? a.courseId,
      courseName: a.course?.name ?? '',
      deadline: a.deadline,
      status: isActive ? 'active' : 'expired',
    };
  }

  private mapRecording(r: any) {
    return {
      id: r.id,
      title: r.title,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      duration: r.duration ?? '0:00',
      uploadDate: r.createdAt,
      category: r.category ? { id: r.category.id, name: r.category.name } : null,
      categoryId: r.categoryId ?? null,
      assignments: (r.courseAssignments ?? []).map((a: any) => this.mapAssignment(a)),
    };
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async getCategories(instituteId: string) {
    return this.categoryRepo.findByInstituteId(instituteId);
  }

  async createCategory(instituteId: string, dto: CreateRecordingCategoryDto) {
    return this.categoryRepo.createForInstitute(dto.name.trim(), instituteId);
  }

  async renameCategory(instituteId: string, categoryId: string, name: string) {
    const cat = await this.categoryRepo.findOne({ where: { id: categoryId, instituteId } as any });
    if (!cat) throw new NotFoundException('Category not found');
    const existing = await this.categoryRepo.findOne({ where: { name: name.trim(), instituteId } as any });
    if (existing && existing.id !== categoryId) throw new BadRequestException(`Category "${name.trim()}" already exists`);
    cat.name = name.trim();
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(instituteId: string, categoryId: string) {
    const cat = await this.categoryRepo.findOne({ where: { id: categoryId, instituteId } as any });
    if (!cat) throw new NotFoundException('Category not found');
    await this.categoryRepo.delete(categoryId);
    return { message: 'Category deleted' };
  }

  // ── Recordings ─────────────────────────────────────────────────────────────

  async getRecordings(
    instituteId: string,
    filters?: { categoryId?: string; search?: string },
  ) {
    const recordings = await this.recordingRepo.findByInstituteId(instituteId, filters);
    return recordings.map((r) => this.mapRecording(r));
  }

  async getRecordingById(instituteId: string, recordingId: string) {
    const recording = await this.recordingRepo.findOneWithRelations(recordingId, instituteId);
    if (!recording) throw new NotFoundException('Recording not found');
    return this.mapRecording(recording);
  }

  async createRecording(
    instituteId: string,
    uploadedById: string,
    dto: CreateRecordingDto,
    file?: Express.Multer.File,
  ) {
    if (dto.categoryId) {
      const cat = await this.categoryRepo.findOne({
        where: { id: dto.categoryId, instituteId } as any,
      });
      if (!cat) throw new BadRequestException('Category not found in this institute');
    }

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    if (file) {
      fileUrl = await this.minioService.uploadFile(file, 'recordings');
      fileName = file.originalname;
    }

    const recording = await this.recordingRepo.create({
      title: dto.title,
      categoryId: dto.categoryId ?? null,
      fileUrl,
      fileName,
      instituteId,
      uploadedById,
    });

    // Optionally assign to a course on upload
    if (dto.courseId && dto.deadline) {
      await this.assignmentRepo.create({
        recordingId: recording.id,
        courseId: dto.courseId,
        deadline: dto.deadline,
      });
    }

    return this.getRecordingById(instituteId, recording.id);
  }

  async updateRecording(
    instituteId: string,
    recordingId: string,
    dto: UpdateRecordingDto,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(recordingId, instituteId);
    if (!recording) throw new NotFoundException('Recording not found');

    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const cat = await this.categoryRepo.findOne({
          where: { id: dto.categoryId, instituteId } as any,
        });
        if (!cat) throw new BadRequestException('Category not found in this institute');
      }
      recording.categoryId = dto.categoryId ?? null;
    }

    if (dto.title) recording.title = dto.title;

    await this.recordingRepo.save(recording);
    return this.getRecordingById(instituteId, recordingId);
  }

  async deleteRecording(instituteId: string, recordingId: string) {
    const recording = await this.recordingRepo.findOneWithRelations(recordingId, instituteId);
    if (!recording) throw new NotFoundException('Recording not found');

    if (recording.fileName) {
      try {
        await this.minioService.deleteFile(recording.fileName, 'recordings');
      } catch {
        // File may not exist in storage — continue anyway
      }
    }

    await this.recordingRepo.delete(recordingId);
    return { message: 'Recording deleted' };
  }

  // ── Course assignments ─────────────────────────────────────────────────────

  async assignToCourse(
    instituteId: string,
    recordingId: string,
    dto: AssignRecordingDto,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(recordingId, instituteId);
    if (!recording) throw new NotFoundException('Recording not found');

    const alreadyAssigned = recording.courseAssignments?.some(
      (a) => a.courseId === dto.courseId,
    );
    if (alreadyAssigned) {
      throw new BadRequestException('Recording is already assigned to this course');
    }

    await this.assignmentRepo.create({
      recordingId,
      courseId: dto.courseId,
      deadline: dto.deadline,
    });

    return this.getRecordingById(instituteId, recordingId);
  }

  async removeAssignment(
    instituteId: string,
    recordingId: string,
    assignmentId: string,
  ) {
    const recording = await this.recordingRepo.findOneWithRelations(recordingId, instituteId);
    if (!recording) throw new NotFoundException('Recording not found');

    const assignment = recording.courseAssignments?.find((a) => a.id === assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.assignmentRepo.delete(assignmentId);
    return { message: 'Assignment removed' };
  }
}
