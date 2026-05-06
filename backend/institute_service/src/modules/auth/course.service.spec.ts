import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

import { CourseService } from './course.service';
import { CourseRepository, TeacherRepository } from '../../infra/database/repositories';
import { ModuleContentRepository } from '../../infra/database/repositories/module-content.repository';
import { CourseModuleRepository } from '../../infra/database/repositories/course-module.repository';
import { VoiceAgentClient } from '../../infra/http/voice-agent.client';
import { AiCoreClient } from '../../infra/http/ai-core.client';
import { MinioService } from '../../infra/storage/minio.service';
import { ContentType } from './entities/module-content.entity';

const mockCourseRepository = {
  findByInstituteId: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findByStudentUserId: jest.fn(),
  findByTeacherUserId: jest.fn(),
  findCourseWithModulesForTeacher: jest.fn(),
  findCoursesWithQuizzesByTeacher: jest.fn(),
  findCoursesWithQuizzesByStudent: jest.fn(),
  findCoursesWithQuizzesAndStudentsByTeacher: jest.fn(),
};

const mockTeacherRepository = {
  findOne: jest.fn(),
};

const mockModuleContentRepository = {
  findByModuleId: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCourseModuleRepository = {
  findByCourseId: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockVoiceAgentClient = {
  ensureCourseCollection: jest.fn().mockResolvedValue(undefined),
  indexContent: jest.fn().mockResolvedValue(undefined),
  deleteContent: jest.fn().mockResolvedValue(undefined),
  searchCourseKB: jest.fn(),
};

const mockAiCoreClient = {
  getAdaptiveRecommendations: jest.fn(),
};

const mockMinioService = {
  uploadFile: jest.fn(),
};

describe('CourseService (institute_service)', () => {
  let service: CourseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: CourseRepository, useValue: mockCourseRepository },
        { provide: TeacherRepository, useValue: mockTeacherRepository },
        { provide: ModuleContentRepository, useValue: mockModuleContentRepository },
        { provide: CourseModuleRepository, useValue: mockCourseModuleRepository },
        { provide: VoiceAgentClient, useValue: mockVoiceAgentClient },
        { provide: AiCoreClient, useValue: mockAiCoreClient },
        { provide: MinioService, useValue: mockMinioService },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  // ─── createCourse ─────────────────────────────────────────────────────────

  describe('createCourse', () => {
    it('creates course without teacher when no assignedTeacherId', async () => {
      const saved = { id: 'c1', name: 'Math', teachers: [], modules: [] };
      mockCourseRepository.create.mockResolvedValue(saved);

      const result = await service.createCourse('inst1', { name: 'Math' } as any);
      expect(result.assignedTeacher).toBeNull();
    });

    it('creates course and assigns teacher when assignedTeacherId provided', async () => {
      const teacher = { userId: 't1', user: { firstName: 'Alice', lastName: 'B', email: 'a@b.com', profilePicture: null } };
      mockTeacherRepository.findOne.mockResolvedValue(teacher);
      const saved = { id: 'c1', name: 'Math', teachers: [teacher], modules: [] };
      mockCourseRepository.create.mockResolvedValue(saved);

      const result = await service.createCourse('inst1', { name: 'Math', assignedTeacherId: 't1' } as any);
      expect(result.assignedTeacher?.id).toBe('t1');
    });

    it('pre-creates qdrant collection (fire-and-forget)', async () => {
      const saved = { id: 'c1', name: 'Math', teachers: [], modules: [] };
      mockCourseRepository.create.mockResolvedValue(saved);

      await service.createCourse('inst1', { name: 'Math' } as any);
      await Promise.resolve(); // flush microtask
      expect(mockVoiceAgentClient.ensureCourseCollection).toHaveBeenCalledWith('inst1', 'c1');
    });
  });

  // ─── getCourses ───────────────────────────────────────────────────────────

  describe('getCourses', () => {
    it('returns mapped courses for institute', async () => {
      mockCourseRepository.findByInstituteId.mockResolvedValue([
        { id: 'c1', name: 'Math', teachers: [], modules: [] },
      ]);

      const result = await service.getCourses('inst1');
      expect(result).toHaveLength(1);
      expect(result[0].assignedTeacher).toBeNull();
    });
  });

  // ─── getCourseById ────────────────────────────────────────────────────────

  describe('getCourseById', () => {
    it('returns course when found', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [] });
      const result = await service.getCourseById('inst1', 'c1');
      expect(result.id).toBe('c1');
    });

    it('throws NotFoundException when course not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);
      await expect(service.getCourseById('inst1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── updateCourse ─────────────────────────────────────────────────────────

  describe('updateCourse', () => {
    it('updates course fields and saves', async () => {
      const course: any = { id: 'c1', name: 'Old', teachers: [], instituteId: 'inst1' };
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockCourseRepository.save.mockResolvedValue({ ...course, name: 'New', teachers: [] });

      const result = await service.updateCourse('inst1', 'c1', { name: 'New' } as any);
      expect(result.assignedTeacher).toBeNull();
    });

    it('updates assigned teacher when assignedTeacherId provided', async () => {
      const course: any = { id: 'c1', name: 'Math', teachers: [] };
      const teacher = { userId: 't2', user: { firstName: 'Bob', lastName: 'C', email: 'b@c.com', profilePicture: null } };
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockTeacherRepository.findOne.mockResolvedValue(teacher);
      mockCourseRepository.save.mockResolvedValue({ ...course, teachers: [teacher] });

      const result = await service.updateCourse('inst1', 'c1', { assignedTeacherId: 't2' } as any);
      expect(result.assignedTeacher?.id).toBe('t2');
    });

    it('clears teachers when assignedTeacherId is falsy', async () => {
      const course: any = { id: 'c1', name: 'Math', teachers: [{ userId: 't1' }] };
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockCourseRepository.save.mockResolvedValue({ ...course, teachers: [] });

      const result = await service.updateCourse('inst1', 'c1', { assignedTeacherId: null } as any);
      expect(result.assignedTeacher).toBeNull();
    });
  });

  // ─── deleteCourse ─────────────────────────────────────────────────────────

  describe('deleteCourse', () => {
    it('clears join tables and deletes course', async () => {
      const course: any = { id: 'c1', teachers: [{ userId: 't1' }], students: [] };
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockCourseRepository.save.mockResolvedValue(course);
      mockCourseRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteCourse('inst1', 'c1');
      expect(result.message).toMatch(/successfully/i);
      expect(mockCourseRepository.delete).toHaveBeenCalledWith('c1');
    });

    it('throws NotFoundException when course not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);
      await expect(service.deleteCourse('inst1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── createModuleForTeacher ───────────────────────────────────────────────

  describe('createModuleForTeacher', () => {
    const course = { id: 'c1', teachers: [{ userId: 'u1' }] };

    it('creates module for assigned teacher', async () => {
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockCourseModuleRepository.findByCourseId.mockResolvedValue([]);
      mockCourseModuleRepository.create.mockResolvedValue({ id: 'm1', title: 'Intro', courseId: 'c1', order: 0 });

      const result = await service.createModuleForTeacher('inst1', 'c1', 'u1', { title: 'Intro' });
      expect(result.id).toBe('m1');
    });

    it('throws ForbiddenException when teacher not assigned', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'other' }] });
      await expect(service.createModuleForTeacher('inst1', 'c1', 'u1', { title: 'Intro' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when course not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue(null);
      await expect(service.createModuleForTeacher('inst1', 'c1', 'u1', { title: 'Intro' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── updateModuleForTeacher ───────────────────────────────────────────────

  describe('updateModuleForTeacher', () => {
    it('updates module fields', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'u1' }] });
      const mod: any = { id: 'm1', title: 'Old', courseId: 'c1' };
      mockCourseModuleRepository.findOne.mockResolvedValue(mod);
      mockCourseModuleRepository.save.mockResolvedValue({ ...mod, title: 'New' });

      const result = await service.updateModuleForTeacher('inst1', 'c1', 'm1', 'u1', { title: 'New' });
      expect(result.title).toBe('New');
    });

    it('throws NotFoundException when module not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'u1' }] });
      mockCourseModuleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateModuleForTeacher('inst1', 'c1', 'missing', 'u1', { title: 'X' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── deleteModuleForTeacher ───────────────────────────────────────────────

  describe('deleteModuleForTeacher', () => {
    it('deletes module and cleans up KB for indexed content', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'u1' }] });
      mockCourseModuleRepository.findOne.mockResolvedValue({ id: 'm1', courseId: 'c1' });
      mockModuleContentRepository.findByModuleId.mockResolvedValue([
        { id: 'cnt1', type: ContentType.PDF, url: 'http://doc.pdf' },
      ]);
      mockCourseModuleRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteModuleForTeacher('inst1', 'c1', 'm1', 'u1');
      expect(result.message).toMatch(/successfully/i);
      await Promise.resolve();
      expect(mockVoiceAgentClient.deleteContent).toHaveBeenCalledWith('inst1', 'c1', 'cnt1');
    });

    it('does not call KB delete for non-indexable content', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'u1' }] });
      mockCourseModuleRepository.findOne.mockResolvedValue({ id: 'm1', courseId: 'c1' });
      mockModuleContentRepository.findByModuleId.mockResolvedValue([
        { id: 'cnt2', type: ContentType.VIDEO, url: 'http://video.mp4' },
      ]);
      mockCourseModuleRepository.delete.mockResolvedValue(undefined);

      await service.deleteModuleForTeacher('inst1', 'c1', 'm1', 'u1');
      await Promise.resolve();
      expect(mockVoiceAgentClient.deleteContent).not.toHaveBeenCalled();
    });
  });

  // ─── createContentForTeacher ──────────────────────────────────────────────

  describe('createContentForTeacher', () => {
    it('creates PDF content and triggers indexing', async () => {
      const course = { id: 'c1', name: 'Math', teachers: [{ userId: 'u1' }] };
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockCourseModuleRepository.findOne.mockResolvedValue({ id: 'm1', courseId: 'c1' });
      mockModuleContentRepository.findByModuleId.mockResolvedValue([]);
      const content = { id: 'cnt1', type: ContentType.PDF, url: 'http://doc.pdf', title: 'Lecture 1', moduleId: 'm1', order: 0 };
      mockModuleContentRepository.create.mockResolvedValue(content);

      const result = await service.createContentForTeacher('inst1', 'c1', 'm1', 'u1', {
        title: 'Lecture 1',
        type: ContentType.PDF,
        url: 'http://doc.pdf',
      });
      expect(result.id).toBe('cnt1');
      await Promise.resolve();
      expect(mockVoiceAgentClient.indexContent).toHaveBeenCalled();
    });

    it('does not index video content', async () => {
      const course = { id: 'c1', name: 'Math', teachers: [{ userId: 'u1' }] };
      mockCourseRepository.findOne.mockResolvedValue(course);
      mockCourseModuleRepository.findOne.mockResolvedValue({ id: 'm1', courseId: 'c1' });
      mockModuleContentRepository.findByModuleId.mockResolvedValue([]);
      const content = { id: 'cnt2', type: ContentType.VIDEO, url: 'http://vid.mp4', title: 'Video 1', moduleId: 'm1', order: 0 };
      mockModuleContentRepository.create.mockResolvedValue(content);

      await service.createContentForTeacher('inst1', 'c1', 'm1', 'u1', {
        title: 'Video 1',
        type: ContentType.VIDEO,
        url: 'http://vid.mp4',
      });
      await Promise.resolve();
      expect(mockVoiceAgentClient.indexContent).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when module not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', name: 'Math', teachers: [{ userId: 'u1' }] });
      mockCourseModuleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createContentForTeacher('inst1', 'c1', 'bad-module', 'u1', { title: 'X', type: ContentType.PDF })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── deleteContentForTeacher ──────────────────────────────────────────────

  describe('deleteContentForTeacher', () => {
    it('deletes content and removes from KB for PDF', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'u1' }] });
      mockModuleContentRepository.findById.mockResolvedValue({ id: 'cnt1', moduleId: 'm1', type: ContentType.PDF, url: 'http://doc.pdf' });
      mockModuleContentRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteContentForTeacher('inst1', 'c1', 'm1', 'cnt1', 'u1');
      expect(result.message).toMatch(/successfully/i);
      await Promise.resolve();
      expect(mockVoiceAgentClient.deleteContent).toHaveBeenCalledWith('inst1', 'c1', 'cnt1');
    });

    it('throws NotFoundException when content not found', async () => {
      mockCourseRepository.findOne.mockResolvedValue({ id: 'c1', teachers: [{ userId: 'u1' }] });
      mockModuleContentRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteContentForTeacher('inst1', 'c1', 'm1', 'missing', 'u1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── recordStudentQuizAttempt ─────────────────────────────────────────────

  describe('recordStudentQuizAttempt', () => {
    it('records attempt and returns success', async () => {
      mockModuleContentRepository.findOne.mockResolvedValue({
        id: 'cnt1',
        quizData: { maxAttempts: 3 },
        studentAttempts: {},
      });
      mockModuleContentRepository.update.mockResolvedValue(undefined);

      const result = await service.recordStudentQuizAttempt('inst1', 'cnt1', 'u1', 85);
      expect(result.success).toBe(true);
      expect(result.score).toBe(85);
    });

    it('throws ConflictException when max attempts reached', async () => {
      mockModuleContentRepository.findOne.mockResolvedValue({
        id: 'cnt1',
        quizData: { maxAttempts: 1 },
        studentAttempts: { u1: { score: 70, attemptCount: 1 } },
      });

      await expect(
        service.recordStudentQuizAttempt('inst1', 'cnt1', 'u1', 80)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when content not found', async () => {
      mockModuleContentRepository.findOne.mockResolvedValue(null);
      await expect(
        service.recordStudentQuizAttempt('inst1', 'missing', 'u1', 50)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('increments attemptCount on each submission', async () => {
      const content = {
        id: 'cnt1',
        quizData: { maxAttempts: 5 },
        studentAttempts: { u1: { score: 60, attemptCount: 2 } },
      };
      mockModuleContentRepository.findOne.mockResolvedValue(content);
      mockModuleContentRepository.update.mockImplementation((_id, data) => {
        content.studentAttempts = data.studentAttempts;
        return Promise.resolve(undefined);
      });

      await service.recordStudentQuizAttempt('inst1', 'cnt1', 'u1', 75);
      expect(content.studentAttempts['u1'].attemptCount).toBe(3);
    });
  });

  // ─── searchCourseKB ───────────────────────────────────────────────────────

  describe('searchCourseKB', () => {
    it('delegates to voiceAgentClient and wraps result', async () => {
      mockVoiceAgentClient.searchCourseKB.mockResolvedValue(['result1', 'result2']);

      const result = await service.searchCourseKB('inst1', 'c1', 'what is math');
      expect(result.results).toEqual(['result1', 'result2']);
      expect(mockVoiceAgentClient.searchCourseKB).toHaveBeenCalledWith('inst1', 'c1', 'what is math', 3);
    });
  });

  // ─── getAdaptiveRecommendations ───────────────────────────────────────────

  describe('getAdaptiveRecommendations', () => {
    it('classifies weak topics (< 70%) and strong topics (>= 70%)', async () => {
      mockCourseRepository.findCoursesWithQuizzesByStudent.mockResolvedValue([
        {
          id: 'c1',
          name: 'Math',
          modules: [
            {
              contents: [
                {
                  id: 'q1',
                  title: 'Algebra',
                  quizData: { questions: [{ marks: 10 }] },
                  studentAttempts: { u1: { score: 4 } }, // 40% → weak
                },
                {
                  id: 'q2',
                  title: 'Geometry',
                  quizData: { questions: [{ marks: 10 }] },
                  studentAttempts: { u1: { score: 8 } }, // 80% → strong
                },
              ],
            },
          ],
        },
      ]);
      mockAiCoreClient.getAdaptiveRecommendations.mockResolvedValue({
        recommendations: ['Study Algebra more'],
        studyPlan: 'Focus on weak areas',
      });

      const result = await service.getAdaptiveRecommendations('inst1', 'u1');
      expect(result.weakTopics.map((t) => t.topic)).toContain('Algebra');
      expect(result.strongTopics.map((t) => t.topic)).toContain('Geometry');
      expect(result.overallAverage).toBe(60);
      expect(result.recommendations).toEqual(['Study Algebra more']);
    });

    it('returns zero average with no attempted quizzes', async () => {
      mockCourseRepository.findCoursesWithQuizzesByStudent.mockResolvedValue([
        {
          id: 'c1',
          name: 'Math',
          modules: [
            {
              contents: [
                {
                  id: 'q1',
                  title: 'Algebra',
                  quizData: { questions: [{ marks: 10 }] },
                  studentAttempts: {}, // no attempt
                },
              ],
            },
          ],
        },
      ]);

      const result = await service.getAdaptiveRecommendations('inst1', 'u1');
      expect(result.overallAverage).toBe(0);
      expect(result.weakTopics).toHaveLength(0);
      expect(result.strongTopics).toHaveLength(0);
    });
  });
});
