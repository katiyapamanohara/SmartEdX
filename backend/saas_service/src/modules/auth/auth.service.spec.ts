import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import {
  UserRepository,
  RoleRepository,
  InstituteRepository,
  InstituteUserRepository,
  InstituteRoleRepository,
  SubscriptionRepository,
} from '../../infra/database/repositories';
import { MinioService } from '../../infra/storage/minio.service';

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllExcludingSystemAdmin: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockRoleRepository = {
  findByName: jest.fn(),
};

const mockInstituteRoleRepository = {
  findAll: jest.fn(),
  findByName: jest.fn(),
};

const mockInstituteRepository = {
  findById: jest.fn(),
  findBy: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockInstituteUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByInstituteId: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  countStudentsByInstituteIds: jest.fn(),
};

const mockSubscriptionRepository = {
  findAll: jest.fn(),
  findAllWithInstitutes: jest.fn(),
  findByInstituteId: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = { get: jest.fn() };
const mockMinioService = { uploadFile: jest.fn() };
const mockFirebaseApp = {
  auth: jest.fn().mockReturnValue({ verifyIdToken: jest.fn() }),
};

describe('AuthService (saas_service)', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: RoleRepository, useValue: mockRoleRepository },
        { provide: InstituteRoleRepository, useValue: mockInstituteRoleRepository },
        { provide: InstituteRepository, useValue: mockInstituteRepository },
        { provide: InstituteUserRepository, useValue: mockInstituteUserRepository },
        { provide: SubscriptionRepository, useValue: mockSubscriptionRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MinioService, useValue: mockMinioService },
        { provide: 'FIREBASE_APP', useValue: mockFirebaseApp },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'new@user.com', password: 'pass123', firstName: 'Jane', lastName: 'Doe' };

    it('creates user with hashed password and returns token', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoleRepository.findByName.mockResolvedValue({ id: 'r1', name: 'owner' });
      const savedUser = { id: 'u1', email: 'new@user.com', firstName: 'Jane', lastName: 'Doe', isNew: true };
      mockUserRepository.create.mockResolvedValue(savedUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(dto as any);
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe('new@user.com');
      expect(result.user.role).toBe('owner');
    });

    it('throws ConflictException when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(service.register(dto as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when owner role not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoleRepository.findByName.mockResolvedValue(null);
      await expect(service.register(dto as any)).rejects.toThrow('Owner role not found');
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns token for saas user with valid credentials', async () => {
      const hashedPw = await bcrypt.hash('secret', 10);
      const user = { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', password: hashedPw, isActive: true, role: { name: 'owner' } };
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login({ email: 'a@b.com', password: 'secret' });
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.type).toBe('saas_user');
    });

    it('falls back to institute user when saas user not found', async () => {
      const hashedPw = await bcrypt.hash('secret', 10);
      const instUser = { id: 'iu1', email: 'a@b.com', firstName: 'A', lastName: 'B', password: hashedPw, isActive: true, role: { name: 'teacher' } };
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockInstituteUserRepository.findByEmail.mockResolvedValue(instUser);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login({ email: 'a@b.com', password: 'secret' });
      expect(result.user.type).toBe('institute_user');
    });

    it('throws UnauthorizedException when neither user found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockInstituteUserRepository.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pw' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hashedPw = await bcrypt.hash('correct', 10);
      mockUserRepository.findByEmail.mockResolvedValue({ password: hashedPw, isActive: true });
      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is inactive', async () => {
      const hashedPw = await bcrypt.hash('secret', 10);
      mockUserRepository.findByEmail.mockResolvedValue({ password: hashedPw, isActive: false });
      await expect(service.login({ email: 'a@b.com', password: 'secret' })).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── validateUser ─────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('finds saas user first', async () => {
      mockUserRepository.findById.mockResolvedValue({ id: 'u1', email: 'a@b.com', password: 'hashed' });
      const result = await service.validateUser('u1');
      expect(result).not.toHaveProperty('password');
    });

    it('falls back to institute user when saas user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', email: 'b@c.com', password: 'hashed' });
      const result = await service.validateUser('iu1');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('b@c.com');
    });

    it('returns null when user not found anywhere', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      mockInstituteUserRepository.findById.mockResolvedValue(null);
      const result = await service.validateUser('missing');
      expect(result).toBeNull();
    });
  });

  // ─── firebaseLogin ────────────────────────────────────────────────────────

  describe('firebaseLogin', () => {
    const dto = { idToken: 'valid-firebase-token' };

    beforeEach(() => {
      mockFirebaseApp.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({ email: 'fb@user.com' }),
      });
    });

    it('returns token on successful login', async () => {
      const user = { id: 'u1', email: 'fb@user.com', firstName: 'F', lastName: 'B', isActive: true, isNew: false, role: { name: 'owner' } };
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.firebaseLogin(dto);
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.role).toBe('owner');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      await expect(service.firebaseLogin(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when account inactive', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ isActive: false, role: { name: 'owner' } });
      await expect(service.firebaseLogin(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when token is empty', async () => {
      await expect(service.firebaseLogin({ idToken: '' })).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── firebaseRegister ─────────────────────────────────────────────────────

  describe('firebaseRegister', () => {
    const dto = {
      idToken: 'valid-firebase-token',
      email: 'fb@user.com',
      firstName: 'Fire',
      lastName: 'Base',
    };

    beforeEach(() => {
      mockFirebaseApp.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({ email: 'fb@user.com' }),
      });
    });

    it('creates user from firebase token and returns token', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockRoleRepository.findByName.mockResolvedValue({ id: 'r1', name: 'owner' });
      const saved = { id: 'u1', email: 'fb@user.com', firstName: 'Fire', lastName: 'Base', isNew: true };
      mockUserRepository.create.mockResolvedValue(saved);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.firebaseRegister(dto as any);
      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe('fb@user.com');
    });

    it('throws ConflictException when user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });
      await expect(service.firebaseRegister(dto as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws UnauthorizedException when email does not match token', async () => {
      mockFirebaseApp.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({ email: 'other@user.com' }),
      });
      await expect(service.firebaseRegister(dto as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when token is empty', async () => {
      await expect(service.firebaseRegister({ ...dto, idToken: '' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── verifyToken ──────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('returns decoded payload on valid token', () => {
      const payload = { sub: 'u1', email: 'a@b.com', role: 'owner' };
      mockJwtService.verify.mockReturnValue(payload);
      expect(service.verifyToken('valid')).toEqual(payload);
    });

    it('throws UnauthorizedException on expired/invalid token', () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('expired'); });
      expect(() => service.verifyToken('bad')).toThrow(UnauthorizedException);
    });
  });

  // ─── completeOnboarding ───────────────────────────────────────────────────

  describe('completeOnboarding', () => {
    it('creates institute and updates user', async () => {
      const user: any = { id: 'u1', phoneNumber: null, isNew: true };
      mockUserRepository.findById.mockResolvedValue(user);
      mockInstituteRepository.create.mockResolvedValue({ id: 'inst1' });
      mockUserRepository.save.mockResolvedValue({ ...user, isNew: false });

      const result = await service.completeOnboarding('u1', {
        instituteName: 'My Institute',
        numberOfStudents: 100,
        hearAboutUs: 'Google',
        primaryUseCase: 'Teaching',
        phoneNumber: '+94771234567',
      } as any);

      expect(user.isNew).toBe(false);
      expect(user.phoneNumber).toBe('+94771234567');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(service.completeOnboarding('missing', {} as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── getUserInstitutes ────────────────────────────────────────────────────

  describe('getUserInstitutes', () => {
    it('returns institutes with real student counts', async () => {
      mockUserRepository.findById.mockResolvedValue({ id: 'u1' });
      mockInstituteRepository.findBy.mockResolvedValue([{ id: 'inst1', name: 'A' }]);
      mockInstituteUserRepository.countStudentsByInstituteIds.mockResolvedValue({ inst1: 42 });

      const result = await service.getUserInstitutes('u1');
      expect(result[0].realStudentCount).toBe(42);
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(service.getUserInstitutes('missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── createInstitute ──────────────────────────────────────────────────────

  describe('createInstitute', () => {
    it('creates institute linked to user', async () => {
      mockUserRepository.findById.mockResolvedValue({ id: 'u1' });
      const inst = { id: 'inst1', name: 'New Inst', ownerId: 'u1' };
      mockInstituteRepository.create.mockResolvedValue(inst);

      const result = await service.createInstitute('u1', { name: 'New Inst' } as any);
      expect(result.ownerId).toBe('u1');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(service.createInstitute('missing', {} as any)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── updateInstitute ──────────────────────────────────────────────────────

  describe('updateInstitute', () => {
    it('updates and saves institute', async () => {
      const inst: any = { id: 'inst1', name: 'Old' };
      mockInstituteRepository.findById.mockResolvedValue(inst);
      mockInstituteRepository.save.mockResolvedValue({ ...inst, name: 'New' });

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
    it('deletes when owner matches', async () => {
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', ownerId: 'u1' });
      mockInstituteRepository.delete.mockResolvedValue(undefined);

      await service.deleteInstitute('inst1', 'u1');
      expect(mockInstituteRepository.delete).toHaveBeenCalledWith('inst1');
    });

    it('throws NotFoundException when not found', async () => {
      mockInstituteRepository.findById.mockResolvedValue(null);
      await expect(service.deleteInstitute('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws UnauthorizedException when not owner', async () => {
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1', ownerId: 'owner' });
      await expect(service.deleteInstitute('inst1', 'other')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── assignUserToInstitute ────────────────────────────────────────────────

  describe('assignUserToInstitute', () => {
    it('creates new institute user when email not already assigned', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue(null);
      mockInstituteRoleRepository.findByName.mockResolvedValue({ id: 'r1', name: 'teacher' });
      mockInstituteRepository.findById.mockResolvedValue({ id: 'inst1' });
      const created = { id: 'iu1', email: 'new@inst.com', instituteId: 'inst1' };
      mockInstituteUserRepository.create.mockResolvedValue(created);

      const result = await service.assignUserToInstitute('inst1', { email: 'new@inst.com', roleName: 'teacher' });
      expect(result.email).toBe('new@inst.com');
    });

    it('throws ConflictException when email already assigned to institute', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.assignUserToInstitute('inst1', { email: 'dup@inst.com', roleName: 'teacher' })
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when role not found', async () => {
      mockInstituteUserRepository.findOne.mockResolvedValue(null);
      mockInstituteRoleRepository.findByName.mockResolvedValue(null);
      await expect(
        service.assignUserToInstitute('inst1', { email: 'a@b.com', roleName: 'unknown' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── deleteInstituteUser ──────────────────────────────────────────────────

  describe('deleteInstituteUser', () => {
    it('removes user and returns success message', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', instituteId: 'inst1' });
      mockInstituteUserRepository.delete.mockResolvedValue(undefined);

      const result = await service.deleteInstituteUser('inst1', 'iu1');
      expect(result.message).toMatch(/successfully/i);
    });

    it('throws NotFoundException when user not in institute', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', instituteId: 'other' });
      await expect(service.deleteInstituteUser('inst1', 'iu1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── toggleInstituteUserStatus ────────────────────────────────────────────

  describe('toggleInstituteUserStatus', () => {
    it('toggles isActive from true to false', async () => {
      const user: any = { id: 'iu1', instituteId: 'inst1', isActive: true };
      mockInstituteUserRepository.findById.mockResolvedValue(user);
      mockInstituteUserRepository.save.mockResolvedValue(user);

      await service.toggleInstituteUserStatus('inst1', 'iu1');
      expect(user.isActive).toBe(false);
    });

    it('throws NotFoundException when user not in institute', async () => {
      mockInstituteUserRepository.findById.mockResolvedValue({ id: 'iu1', instituteId: 'wrong' });
      await expect(service.toggleInstituteUserStatus('inst1', 'iu1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── cancelSubscription ───────────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('sets status to cancelled and saves', async () => {
      const sub: any = { id: 'sub1', status: 'active' };
      mockSubscriptionRepository.findById.mockResolvedValue(sub);
      mockSubscriptionRepository.save.mockResolvedValue({ ...sub, status: 'cancelled' });

      const result = await service.cancelSubscription('sub1');
      expect(sub.status).toBe('cancelled');
    });

    it('throws NotFoundException when subscription not found', async () => {
      mockSubscriptionRepository.findById.mockResolvedValue(null);
      await expect(service.cancelSubscription('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── createSubscription ───────────────────────────────────────────────────

  describe('createSubscription', () => {
    it('updates existing subscription when one already exists', async () => {
      const existing: any = { id: 'sub1', instituteId: 'inst1', status: 'active' };
      mockSubscriptionRepository.findByInstituteId.mockResolvedValue(existing);
      mockSubscriptionRepository.save.mockResolvedValue({ ...existing, plan: 'pro' });

      const result = await service.createSubscription({ instituteId: 'inst1', plan: 'pro' } as any);
      expect(existing.plan).toBe('pro');
    });

    it('creates new subscription when none exists', async () => {
      mockSubscriptionRepository.findByInstituteId.mockResolvedValue(null);
      const newSub = { id: 'sub2', instituteId: 'inst1', status: 'active' };
      mockSubscriptionRepository.create.mockResolvedValue(newSub);

      const result = await service.createSubscription({ instituteId: 'inst1' } as any);
      expect(result.id).toBe('sub2');
    });
  });

  // ─── getAdminAnalytics ────────────────────────────────────────────────────

  describe('getAdminAnalytics', () => {
    it('returns correct analytics structure', async () => {
      const now = new Date();
      mockUserRepository.findAll.mockResolvedValue([
        { id: 'u1', email: 'a@b.com', isActive: true, createdAt: now },
        { id: 'u2', email: 'b@c.com', isActive: false, createdAt: new Date('2020-01-01') },
      ]);
      mockInstituteRepository.findAll.mockResolvedValue([
        { id: 'inst1', isActive: true, createdAt: now },
      ]);
      mockSubscriptionRepository.findAll.mockResolvedValue([
        { id: 'sub1', status: 'active', price: '29' },
      ]);

      const result = await service.getAdminAnalytics();
      expect(result.users.total).toBe(2);
      expect(result.users.active).toBe(1);
      expect(result.users.inactive).toBe(1);
      expect(result.institutes.total).toBe(1);
      expect(result.institutes.active).toBe(1);
      expect(result.subscriptions.active).toBe(1);
      expect(result.subscriptions.monthlyRevenue).toBe(29);
    });
  });
});
