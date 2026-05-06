import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException, ConflictException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import {
  InstituteRepository,
  InstituteUserRepository,
  InstituteRoleRepository,
  TeacherRepository,
  StudentRepository,
  CourseRepository,
} from '../../infra/database/repositories';
import { MinioService } from '../../infra/storage/minio.service';
import { FaceRecClient } from '../../infra/http/face-rec.client';

const mockInstituteUserRepository = {
  findByEmail: jest.fn(),
  findByEmailAndInstituteId: jest.fn(),
  findById: jest.fn(),
  findByInstituteId: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getMonthlyStudentEnrollment: jest.fn(),
};

const mockInstituteRepository = {
  findById: jest.fn(),
  findPublicInfoById: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockInstituteRoleRepository = {
  findAll: jest.fn(),
  findByName: jest.fn(),
};

const mockTeacherRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  countByInstituteId: jest.fn(),
};

const mockStudentRepository = {
  findOne: jest.fn(),
  findByInstituteId: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockCourseRepository = {
  findByInstituteId: jest.fn(),
  findByBatchNumberAndInstituteId: jest.fn(),
  findAll: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = { get: jest.fn() };

const mockMinioService = { uploadFile: jest.fn() };

const mockFaceRecClient = { verifyImage: jest.fn() };

const mockFirebaseApp = {
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
};

describe('AuthService (institute_service)', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: InstituteUserRepository, useValue: mockInstituteUserRepository },
        { provide: InstituteRepository, useValue: mockInstituteRepository },
        { provide: InstituteRoleRepository, useValue: mockInstituteRoleRepository },
        { provide: TeacherRepository, useValue: mockTeacherRepository },
        { provide: StudentRepository, useValue: mockStudentRepository },
        { provide: CourseRepository, useValue: mockCourseRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MinioService, useValue: mockMinioService },
        { provide: FaceRecClient, useValue: mockFaceRecClient },
        { provide: 'FIREBASE_APP', useValue: mockFirebaseApp },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'user@example.com', password: 'secret' };

    it('returns access_token and user on valid credentials', async () => {
      const hashedPw = await bcrypt.hash('secret', 10);
      const user = {
        id: 'u1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: null,
        password: hashedPw,
        isActive: true,
        role: { name: 'teacher' },
        instituteId: 'inst1',
      };
      mockInstituteUserRepository.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.type).toBe('institute_user');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockInstituteUserRepository.findByEmail.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hashedPw = await bcrypt.hash('other', 10);
      mockInstituteUserRepository.findByEmail.mockResolvedValue({
        password: hashedPw,
        isActive: true,
      });
      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      const hashedPw = await bcrypt.hash('secret', 10);
      mockInstituteUserRepository.findByEmail.mockResolvedValue({
        password: hashedPw,
        isActive: false,
      });
      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── validateUser ─────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('returns user without password when found', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: 'hashed',
      });
      const result = await service.validateUser('u1');
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email');
    });

    it('returns null when user not found', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue(null);
      const result = await service.validateUser('missing');
      expect(result).toBeNull();
    });
  });

  // ─── getMyProfile ─────────────────────────────────────────────────────────

  describe('getMyProfile', () => {
    it('returns profile with faceEnrolled flag for student with face descriptor', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        password: 'hashed',
        role: { name: 'student' },
      });
      mockStudentRepository.findOne.mockResolvedValue({ faceDescriptor: [0.1, 0.2] });

      const result = await service.getMyProfile('u1') as any;
      expect(result.faceEnrolled).toBe(true);
    });

    it('returns profile with faceEnrolled=false when no descriptor', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        password: 'hashed',
        role: { name: 'student' },
      });
      mockStudentRepository.findOne.mockResolvedValue({ faceDescriptor: null });

      const result = await service.getMyProfile('u1') as any;
      expect(result.faceEnrolled).toBe(false);
    });

    it('returns profile without faceEnrolled for non-student', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue({
        id: 'u1',
        password: 'hashed',
        role: { name: 'teacher' },
      });

      const result = await service.getMyProfile('u1');
      expect(result).not.toHaveProperty('faceEnrolled');
      expect(result).not.toHaveProperty('password');
    });

    it('throws NotFoundException when user not found', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue(null);
      await expect(service.getMyProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── updateMyProfile ──────────────────────────────────────────────────────

  describe('updateMyProfile', () => {
    it('updates and returns user without password', async () => {
      const user: any = { id: 'u1', firstName: 'Old', password: 'hashed' };
      mockInstituteUserRepository.findById.mockResolvedValue(user);
      mockInstituteUserRepository.save.mockResolvedValue(user);

      const result = await service.updateMyProfile('u1', { firstName: 'New' });
      expect(result).not.toHaveProperty('password');
      expect(user.firstName).toBe('New');
    });

    it('throws NotFoundException when user not found', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue(null);
      await expect(service.updateMyProfile('missing', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── saveFaceDescriptor ───────────────────────────────────────────────────

  describe('saveFaceDescriptor', () => {
    it('saves descriptor and returns faceEnrolled: true', async () => {
      const student: any = { faceDescriptor: null };
      mockStudentRepository.findOne.mockResolvedValue(student);
      mockStudentRepository.save.mockResolvedValue(student);

      const result = await service.saveFaceDescriptor('u1', [0.1, 0.2]);
      expect(result.faceEnrolled).toBe(true);
      expect(student.faceDescriptor).toEqual([0.1, 0.2]);
    });

    it('returns faceEnrolled: false when descriptor set to null', async () => {
      const student: any = { faceDescriptor: [0.1] };
      mockStudentRepository.findOne.mockResolvedValue(student);
      mockStudentRepository.save.mockResolvedValue(student);

      const result = await service.saveFaceDescriptor('u1', null);
      expect(result.faceEnrolled).toBe(false);
    });

    it('throws NotFoundException when student not found', async () => {
      mockStudentRepository.findOne.mockResolvedValue(null);
      await expect(service.saveFaceDescriptor('u1', [])).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── verifyFaceFromImage ──────────────────────────────────────────────────

  describe('verifyFaceFromImage', () => {
    it('calls faceRecClient with stored descriptor and returns result', async () => {
      const descriptor = [0.5, 0.6];
      mockStudentRepository.findOne.mockResolvedValue({ faceDescriptor: descriptor });
      mockFaceRecClient.verifyImage.mockResolvedValue({ match: true, confidence: 0.95 });

      const result = await service.verifyFaceFromImage('u1', 'base64img');
      expect(mockFaceRecClient.verifyImage).toHaveBeenCalledWith(descriptor, 'base64img');
      expect(result).toEqual({ match: true, confidence: 0.95 });
    });

    it('throws NotFoundException when student not found', async () => {
      mockStudentRepository.findOne.mockResolvedValue(null);
      await expect(service.verifyFaceFromImage('u1', 'img')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws HttpException 422 when no face enrolled', async () => {
      mockStudentRepository.findOne.mockResolvedValue({ faceDescriptor: null });
      try {
        await service.verifyFaceFromImage('u1', 'img');
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(422);
      }
    });
  });

  // ─── firebaseLogin ────────────────────────────────────────────────────────

  describe('firebaseLogin', () => {
    const dto = { idToken: 'valid-firebase-token' };

    beforeEach(() => {
      mockFirebaseApp.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({
          email: 'fb@example.com',
          given_name: 'Jane',
          family_name: 'Smith',
          picture: 'http://pic.url',
        }),
      });
    });

    it('returns token and user on successful firebase login', async () => {
      const user: any = {
        id: 'u1',
        email: 'fb@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        profilePicture: 'http://pic.url',
        isActive: true,
        role: { name: 'student' },
        instituteId: 'inst1',
      };
      mockInstituteUserRepository.findByEmail.mockResolvedValue(user);
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', isActive: true });
      mockInstituteUserRepository.save.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.firebaseLogin(dto);
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.type).toBe('institute_user');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockInstituteUserRepository.findByEmail.mockResolvedValue(null);
      await expect(service.firebaseLogin(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      mockInstituteUserRepository.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'fb@example.com',
        isActive: false,
        instituteId: 'inst1',
        role: { name: 'student' },
      });
      await expect(service.firebaseLogin(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when institute is inactive', async () => {
      mockInstituteUserRepository.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'fb@example.com',
        isActive: true,
        instituteId: 'inst1',
        role: { name: 'student' },
      });
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', isActive: false });

      await expect(service.firebaseLogin(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates profile when firebase token has different name', async () => {
      const user: any = {
        id: 'u1',
        email: 'fb@example.com',
        firstName: 'OldFirst',
        lastName: 'OldLast',
        profilePicture: null,
        isActive: true,
        role: { name: 'student' },
        instituteId: 'inst1',
      };
      mockInstituteUserRepository.findByEmail.mockResolvedValue(user);
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', isActive: true });
      mockInstituteUserRepository.save.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      await service.firebaseLogin(dto);
      expect(mockInstituteUserRepository.save).toHaveBeenCalled();
      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Smith');
    });
  });

  // ─── verifyToken ──────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('returns payload on valid token', () => {
      const payload = { sub: 'u1', email: 'a@b.com', role: 'teacher' };
      mockJwtService.verify.mockReturnValue(payload);
      expect(service.verifyToken('valid-token')).toEqual(payload);
    });

    it('throws UnauthorizedException on invalid token', () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('expired'); });
      expect(() => service.verifyToken('bad-token')).toThrow(UnauthorizedException);
    });
  });

  // ─── getInstituteInfo ─────────────────────────────────────────────────────

  describe('getInstituteInfo', () => {
    it('returns public institute info', async () => {
      mockInstituteRepository.findPublicInfoById.mockResolvedValue({
        id: 'inst1',
        name: 'Test Institute',
        logo: 'logo.png',
        phoneNumber: '123',
      });

      const result = await service.getInstituteInfo('inst1');
      expect(result).toEqual({ id: 'inst1', name: 'Test Institute', logo: 'logo.png', phoneNumber: '123' });
    });

    it('throws NotFoundException when institute not found', async () => {
      mockInstituteRepository.findPublicInfoById.mockResolvedValue(null);
      await expect(service.getInstituteInfo('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── getPublicCourses ─────────────────────────────────────────────────────

  describe('getPublicCourses', () => {
    it('returns mapped courses with assigned teacher', async () => {
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1' });
      mockCourseRepository.findByInstituteId.mockResolvedValue([
        {
          id: 'c1',
          name: 'Math',
          code: 'M101',
          description: 'Intro',
          batchNumber: '2024',
          coverImage: null,
          price: 100,
          teachers: [
            {
              userId: 't1',
              user: { firstName: 'Alice', lastName: 'Brown', email: 'a@b.com', profilePicture: null },
            },
          ],
          modules: [],
        },
      ]);

      const result = await service.getPublicCourses('inst1');
      expect(result).toHaveLength(1);
      expect(result[0].assignedTeacher?.id).toBe('t1');
    });

    it('throws NotFoundException when institute not found', async () => {
      mockInstituteRepository.findById.mockResolvedValue(null);
      await expect(service.getPublicCourses('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── createInstitute ──────────────────────────────────────────────────────

  describe('createInstitute', () => {
    it('creates and returns institute', async () => {
      const institute = { id: 'inst1', name: 'New Inst', ownerId: 'u1' };
      mockInstituteRepository.create.mockResolvedValue(institute);

      const result = await service.createInstitute('u1', { name: 'New Inst' } as any);
      expect(result.ownerId).toBe('u1');
    });

    it('forces update when ownerId is missing after create', async () => {
      const institute = { id: 'inst1', name: 'New Inst', ownerId: null };
      mockInstituteRepository.create.mockResolvedValue(institute);
      mockInstituteRepository.update.mockResolvedValue(undefined);

      await service.createInstitute('u1', { name: 'New Inst' } as any);
      expect(mockInstituteRepository.update).toHaveBeenCalledWith('inst1', { ownerId: 'u1' });
    });
  });

  // ─── updateInstitute ──────────────────────────────────────────────────────

  describe('updateInstitute', () => {
    it('updates institute and returns it', async () => {
      const institute: any = { id: 'inst1', name: 'Old' };
      mockInstituteRepository.findById.mockResolvedValue(institute);
      mockInstituteRepository.save.mockResolvedValue({ ...institute, name: 'New' });

      const result = await service.updateInstitute('inst1', { name: 'New' } as any);
      expect(result.name).toBe('New');
    });

    it('throws NotFoundException when institute not found', async () => {
      mockInstituteRepository.findById.mockResolvedValue(null);
      await expect(service.updateInstitute('missing', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── deleteInstitute ──────────────────────────────────────────────────────

  describe('deleteInstitute', () => {
    it('deletes institute when owner matches', async () => {
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', ownerId: 'u1' });
      mockInstituteRepository.delete.mockResolvedValue(undefined);

      await service.deleteInstitute('inst1', 'u1');
      expect(mockInstituteRepository.delete).toHaveBeenCalledWith('inst1');
    });

    it('throws NotFoundException when institute not found', async () => {
      mockInstituteRepository.findById.mockResolvedValue(null);
      await expect(service.deleteInstitute('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws UnauthorizedException when caller is not owner', async () => {
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', ownerId: 'owner1' });
      await expect(service.deleteInstitute('inst1', 'other-user')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── getRoles ─────────────────────────────────────────────────────────────

  describe('getRoles', () => {
    it('returns only instructor and teacher roles', async () => {
      mockInstituteRoleRepository.findAll.mockResolvedValue([
        { name: 'teacher' },
        { name: 'student' },
        { name: 'instructor' },
        { name: 'admin' },
      ]);

      const result = await service.getRoles();
      expect(result.map((r) => r.name)).toEqual(expect.arrayContaining(['teacher', 'instructor']));
      expect(result.map((r) => r.name)).not.toContain('student');
      expect(result.map((r) => r.name)).not.toContain('admin');
    });
  });

  // ─── getInstituteUsers ────────────────────────────────────────────────────

  describe('getInstituteUsers', () => {
    it('returns teachers and instructors without student filter', async () => {
      mockInstituteUserRepository.findByInstituteId.mockResolvedValue([
        { id: 'u1', role: { name: 'teacher' }, firstName: 'A', lastName: 'B', email: 'a@b.com', isActive: true, profilePicture: null },
        { id: 'u2', role: { name: 'admin' }, firstName: 'C', lastName: 'D', email: 'c@d.com', isActive: true, profilePicture: null },
      ]);

      const result = await service.getInstituteUsers('inst1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('u1');
    });

    it('returns students from studentRepository when role=student', async () => {
      mockStudentRepository.findByInstituteId.mockResolvedValue([
        {
          user: { id: 'u3', firstName: 'S', lastName: 'T', email: 's@t.com', isActive: true, role: { name: 'student' }, profilePicture: null },
          courses: [],
          batchNumber: 'B1',
        },
      ]);

      const result = await service.getInstituteUsers('inst1', 'student');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('u3');
    });
  });

  // ─── deleteInstituteUser ──────────────────────────────────────────────────

  describe('deleteInstituteUser', () => {
    it('removes user from institute', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', instituteId: 'inst1' });
      mockInstituteUserRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteInstituteUser('inst1', 'iu1');
      expect(result.message).toMatch(/successfully/i);
    });

    it('throws NotFoundException when user not in institute', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', instituteId: 'other' });
      await expect(service.deleteInstituteUser('inst1', 'iu1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when user not found', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue(null);
      await expect(service.deleteInstituteUser('inst1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── toggleInstituteUserStatus ────────────────────────────────────────────

  describe('toggleInstituteUserStatus', () => {
    it('toggles active status from true to false', async () => {
      const user: any = { id: 'iu1', instituteId: 'inst1', isActive: true };
      mockInstituteUserRepository.findById.mockResolvedValue(user);
      mockInstituteUserRepository.save.mockResolvedValue(user);

      await service.toggleInstituteUserStatus('inst1', 'iu1');
      expect(user.isActive).toBe(false);
    });

    it('toggles active status from false to true', async () => {
      const user: any = { id: 'iu1', instituteId: 'inst1', isActive: false };
      mockInstituteUserRepository.findById.mockResolvedValue(user);
      mockInstituteUserRepository.save.mockResolvedValue(user);

      await service.toggleInstituteUserStatus('inst1', 'iu1');
      expect(user.isActive).toBe(true);
    });

    it('throws NotFoundException when user not in institute', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', instituteId: 'other' });
      await expect(service.toggleInstituteUserStatus('inst1', 'iu1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── createInstituteUser ──────────────────────────────────────────────────

  describe('createInstituteUser', () => {
    const baseDto = { email: 'new@inst.com', password: 'pass123', firstName: 'John', lastName: 'Doe', role: 'teacher' };

    it('creates teacher user and teacher record', async () => {
      mockInstituteUserRepository.findByEmailAndInstituteId.mockResolvedValue(null);
      mockInstituteRoleRepository.findByName.mockResolvedValue({ id: 'r1', name: 'teacher' });
      const newUser = { id: 'nu1', email: 'new@inst.com', role: { name: 'teacher' } };
      mockInstituteUserRepository.create.mockResolvedValue(newUser);
      mockTeacherRepository.create.mockResolvedValue({ id: 't1', userId: 'nu1' });
      mockTeacherRepository.save.mockResolvedValue(undefined);

      const result = await service.createInstituteUser('inst1', baseDto);
      expect(result.email).toBe('new@inst.com');
      expect(mockTeacherRepository.create).toHaveBeenCalled();
    });

    it('creates student user and student record', async () => {
      const studentDto = { ...baseDto, role: 'student', batchNumber: 'B2024' };
      mockInstituteUserRepository.findByEmailAndInstituteId.mockResolvedValue(null);
      mockInstituteRoleRepository.findByName.mockResolvedValue({ id: 'r2', name: 'student' });
      const newUser = { id: 'nu2', email: 'new@inst.com', role: { name: 'student' } };
      mockInstituteUserRepository.create.mockResolvedValue(newUser);
      mockCourseRepository.findByBatchNumberAndInstituteId.mockResolvedValue([]);
      mockStudentRepository.create.mockResolvedValue({ id: 's1', userId: 'nu2' });
      mockStudentRepository.save.mockResolvedValue(undefined);

      const result = await service.createInstituteUser('inst1', studentDto);
      expect(result.email).toBe('new@inst.com');
      expect(mockStudentRepository.create).toHaveBeenCalled();
    });

    it('throws ConflictException when non-student user already exists', async () => {
      mockInstituteUserRepository.findByEmailAndInstituteId.mockResolvedValue({ id: 'existing' });
      await expect(service.createInstituteUser('inst1', baseDto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when role not found', async () => {
      mockInstituteUserRepository.findByEmailAndInstituteId.mockResolvedValue(null);
      mockInstituteRoleRepository.findByName.mockResolvedValue(null);
      await expect(service.createInstituteUser('inst1', baseDto)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── getTeacherCount ──────────────────────────────────────────────────────

  describe('getTeacherCount', () => {
    it('returns count from repository', async () => {
      mockTeacherRepository.countByInstituteId.mockResolvedValue(5);
      const result = await service.getTeacherCount('inst1');
      expect(result).toEqual({ count: 5 });
    });
  });

  // ─── getMonthlyStudentEnrollment ──────────────────────────────────────────

  describe('getMonthlyStudentEnrollment', () => {
    it('returns year and monthly data', async () => {
      const data = new Array(12).fill(0);
      mockInstituteUserRepository.getMonthlyStudentEnrollment.mockResolvedValue(data);

      const result = await service.getMonthlyStudentEnrollment('inst1', 2024);
      expect(result).toEqual({ year: 2024, data });
    });
  });
});
