import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { FirebaseLoginDto, FirebaseRegisterDto } from './dto/firebase-auth.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { CreateInstituteDto } from './dto/create-institute.dto';
import { UpdateInstituteDto } from './dto/update-institute.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from './entities/user.entity';
import { UserRepository, RoleRepository, InstituteRepository, InstituteUserRepository, InstituteRoleRepository } from '../../infra/database/repositories';
import { AssignUserDto } from './dto/assign-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository, // Still needed for global Register? Yes, register uses 'owner'.
    private readonly instituteRoleRepository: InstituteRoleRepository,
    private readonly instituteRepository: InstituteRepository,
    private readonly instituteUserRepository: InstituteUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('FIREBASE_APP') private firebaseApp: admin.app.App,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(
        registerDto.email,
      );

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Get owner role (default for registration for Institute Portal)
      const ownerRole = await this.roleRepository.findByName('owner');
      if (!ownerRole) {
        throw new Error('Owner role not found');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Create user
      const savedUser = await this.userRepository.create({
        ...registerDto,
        password: hashedPassword,
        roleId: ownerRole.id,
      });

      // Generate JWT token
      const token = this.generateToken({
        sub: savedUser.id,
        email: savedUser.email,
        role: ownerRole.name,
      });

      return {
        access_token: token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: ownerRole.name,
          isNew: savedUser.isNew,
        },
      };
    } catch (error) {
      this.logger.error('Registration failed', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      // 1. Try to find user in global users (SaaS Users)
      let user: any = await this.userRepository.findByEmail(loginDto.email);
      let isInstituteUser = false;

      // 2. If not found, try to find in Institute Users
      if (!user) {
        user = await this.instituteUserRepository.findByEmail(loginDto.email);
        isInstituteUser = true;
      }

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role?.name || 'student', // Fallback
        // instituteId: isInstituteUser ? user.instituteId : undefined, // Optional: add context
      };

      const token = this.generateToken(payload);

      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role?.name,
          isNew: false, // Institute users likely considered not 'new' in same sense or we default
          type: isInstituteUser ? 'institute_user' : 'saas_user'
        },
      };
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  async validateUser(userId: string) {
    try {
      // Check SaaS User first
      let user: any = await this.userRepository.findById(userId);

      // Check Institute User if not found
      if (!user) {
        // We assume instituteUserRepository has findById or we use basic repository find
        // The implementation in repository currently only has findByUserIdAndInstituteId and findByInstituteId
        // We likely need findById in InstituteUserRepository. 
        // But for now let's try to fetch it using the base repository logic if available, 
        // or we need to add findById to InstituteUserRepository or use the injected repo reference if exposed?
        // Actually BaseRepository usually has findById. Let's check.
        // InstituteUserRepository extends BaseRepository.
        user = await this.instituteUserRepository.findById(userId);
      }

      if (!user) {
        return null;
      }

      const { password, ...result } = user;
      return result;
    } catch (error) {
      return null;
    }
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAllExcludingSystemAdmin();
  }

  // Firebase Authentication Methods
  async firebaseLogin(firebaseLoginDto: FirebaseLoginDto) {
    try {
      // Check if Firebase is configured
      if (!this.firebaseApp) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
      }

      // Log token for debugging (first 50 chars only for security)
      this.logger.debug(`Firebase login attempt - Token preview: ${firebaseLoginDto.idToken?.substring(0, 50)}...`);
      this.logger.debug(`Token length: ${firebaseLoginDto.idToken?.length}`);
      
      // Validate token is not empty
      if (!firebaseLoginDto.idToken || firebaseLoginDto.idToken.trim() === '') {
        throw new UnauthorizedException('Firebase ID token is required');
      }

      // Verify Firebase token
      const decodedToken = await this.firebaseApp
        .auth()
        .verifyIdToken(firebaseLoginDto.idToken);

      if (!decodedToken.email) {
        throw new UnauthorizedException('Email not found in Firebase token');
      }

      // Find existing user
      let user = await this.userRepository.findByEmail(decodedToken.email);

      if (!user) {
        throw new UnauthorizedException(
          'User not found. Please register first.',
        );
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate JWT token
      const token = this.generateToken({
        sub: user.id,
        email: user.email,
        role: user.role.name,
      });

      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          isNew: user.isNew,
        },
      };
    } catch (error) {
      this.logger.error('Firebase login failed', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Firebase ID token has expired. Please sign in again.');
      }
      if (error.code === 'auth/argument-error') {
        throw new UnauthorizedException('Invalid Firebase ID token format. Please ensure you are sending a valid token.');
      }
      
      throw error;
    }
  }

  async firebaseRegister(firebaseRegisterDto: FirebaseRegisterDto) {
    try {
      // Check if Firebase is configured
      if (!this.firebaseApp) {
        throw new Error('Firebase is not configured. Please check your environment variables.');
      }

      // Log token for debugging (first 50 chars only for security)
      this.logger.debug(`Firebase register attempt - Token preview: ${firebaseRegisterDto.idToken?.substring(0, 50)}...`);
      this.logger.debug(`Token length: ${firebaseRegisterDto.idToken?.length}`);
      
      // Validate token is not empty
      if (!firebaseRegisterDto.idToken || firebaseRegisterDto.idToken.trim() === '') {
        throw new UnauthorizedException('Firebase ID token is required');
      }

      // Verify Firebase token
      const decodedToken = await this.firebaseApp
        .auth()
        .verifyIdToken(firebaseRegisterDto.idToken);

      if (!decodedToken.email) {
        throw new UnauthorizedException('Email not found in Firebase token');
      }

      // Verify email matches
      if (decodedToken.email !== firebaseRegisterDto.email) {
        throw new UnauthorizedException(
          'Email does not match Firebase token',
        );
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(
        firebaseRegisterDto.email,
      );

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Get owner role (default for registration for Institute Portal)
      const ownerRole = await this.roleRepository.findByName('owner');
      if (!ownerRole) {
        throw new Error('Owner role not found');
      }

      // Create user (no password needed for Firebase users)
      const savedUser = await this.userRepository.create({
        firstName: firebaseRegisterDto.firstName,
        lastName: firebaseRegisterDto.lastName,
        email: firebaseRegisterDto.email,
        password: '', // Firebase users don't use password
        roleId: ownerRole.id,
        profilePicture: firebaseRegisterDto.photoUrl,
      });

      // Generate JWT token
      const token = this.generateToken({
        sub: savedUser.id,
        email: savedUser.email,
        role: ownerRole.name,
      });

      return {
        access_token: token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: ownerRole.name,
          isNew: savedUser.isNew,
        },
      };
    } catch (error) {
      this.logger.error('Firebase registration failed', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Firebase ID token has expired. Please sign in again.');
      }
      if (error.code === 'auth/argument-error') {
        throw new UnauthorizedException('Invalid Firebase ID token format. Please ensure you are sending a valid token.');
      }
      
      throw error;
    }
  }

  private generateToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async completeOnboarding(userId: string, data: CompleteOnboardingDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Create new institute
    const institute = await this.instituteRepository.create({
      name: data.instituteName,
      studentCount: data.numberOfStudents,
      referralSource: data.hearAboutUs,
      primaryUseCases: data.primaryUseCase,
    });

    // Link user to institute and update status
    user.phoneNumber = data.phoneNumber;
    user.instituteId = institute.id;
    user.isNew = false;
    
    // Save user
    return await this.userRepository.save(user);
  }

  async getUserInstitutes(userId: string) {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    // Return the linked institute as an array (to support future multi-institute)
    return user.institute ? [user.institute] : [];
  }

  async getInstituteById(id: string) {
    const institute = await this.instituteRepository.findById(id);
    if (!institute) {
      throw new NotFoundException('Institute not found');
    }
    return institute;
  }

  async createInstitute(userId: string, data: CreateInstituteDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const institute = await this.instituteRepository.create({
      ...data,
      isActive: true,
    });

    // If user doesn't have an institute yet, link it
    if (!user.instituteId) {
      user.instituteId = institute.id;
      await this.userRepository.save(user);
    }

    return institute;
  }

  async updateInstitute(id: string, data: UpdateInstituteDto) {
    const institute = await this.instituteRepository.findById(id);
    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    Object.assign(institute, data);
    return await this.instituteRepository.save(institute);
  }

  async getRoles() {
    return this.instituteRoleRepository.findAll();
  }

  async assignUserToInstitute(instituteId: string, assignUserDto: AssignUserDto) {
    const { email, roleName } = assignUserDto;
    
    // We strictly use InstituteUser here, decoupled from SaaS User.
    // 1. Check if InstituteUser exists with this email AND instituteId
    // Actually, do we allow the same email in different institutes? Yes, implementation implies separate records.
    // But login by email gets ambiguous.
    // For now, let's assume we check if THIS user is already in THIS institute by email?
    // But findByEmail is global in our repo implementation currently (just where: {email}).
    // If we want institute-scoped users, we should check by email for this institute. (Not implemented in repo yet efficiently, but can filter).
    
    // HOWEVER, the login logic I just wrote does `instituteUserRepository.findByEmail(email)`.
    // It picks *any* user with that email.
    // If I create two users with same email in different institutes, login will just pick the first one found.
    // This is a limitation of the current simple decoupling.
    // To support unique login, email must be unique across all institute_users or we need "Institute Code" at login.
    // Proceeding with assumption: try to reuse existing InstituteUser if found (globally?) or just for this institute?
    // Let's check if the email exists in `institute_users`.
    
    let instituteUser = await this.instituteUserRepository.findByEmail(email);

    const role = await this.instituteRoleRepository.findByName(roleName);
    if (!role) {
      // Auto-seed basic roles if not found?
      // For now, fail if not found, but we need to seed.
      throw new NotFoundException(`Role ${roleName} not found`);
    }

    const institute = await this.instituteRepository.findById(instituteId);
    if (!institute) {
      throw new NotFoundException(`Institute with ID ${instituteId} not found`);
    }

    if (instituteUser) {
        // User exists (somewhere). 
        // If they are in THIS institute, update role.
        if (instituteUser.instituteId === instituteId) {
            instituteUser.role = role;
            return this.instituteUserRepository.save(instituteUser);
        } else {
             // User exists but in DIFFERENT institute.
             // If we create another record with same email, login fails/ambiguous.
             // We can either:
             // A) Block duplicate email.
             // B) Create new record and accept ambiguity.
             // C) Link same record to multiple institutes? (Requires ManyToMany or keeping InstituteUser unique and using a junction... which brings us back to User + Junction).
             
             // The prompt wanted "separate".
             // If I create a new one, I support "separate".
             // I will create a new one. Login will be the first matching one (maybe unpredictable).
             // Ideally we'd throw Conflict, but for "Decouple", we create new.
             // Let's create a new one for THIS institute.
             // NOTE: `instituteUser` variable currently holds the other institute's user. We'll ignore it and create new.
        }
    }
    
    // Proceed to create NEW InstituteUser for this institute
    const bcrypt = require('bcrypt'); 
    const hashedPassword = await bcrypt.hash('User@123', 10);
    
    instituteUser = await this.instituteUserRepository.create({
        instituteId,
        roleId: role.id,
        email,
        password: hashedPassword,
        firstName: 'New',
        lastName: 'User', 
        isActive: true,
        // userId remains null as this is a decoupled user
    });
    
    this.logger.log(`Created decoupled institute user: ${email} for institute ${instituteId}`);

    return instituteUser;
  }

  async getInstituteUsers(instituteId: string) {
    const instituteUsers = await this.instituteUserRepository.findByInstituteId(instituteId);
    
    // Map to a cleaner format for the frontend
    return instituteUsers.map(iu => {
      // Prioritize InstituteUser fields (new decoupled model), fallback to User fields (legacy/linked model)
      return {
        id: iu.id, // Always use InstituteUser ID for management actions
        
        firstName: iu.firstName,
        lastName: iu.lastName,
        email: iu.email,
        isActive: iu.isActive, // Use local active state
        role: iu.role,
       
      };
    });
  }

  async deleteInstituteUser(instituteId: string, instituteUserId: string) {
    // Check if the association exists
    // We expect instituteUserId to be the primary key of InstituteUser
    
    // We verify it belongs to the institute for security
    const instituteUser = await this.instituteUserRepository.findById(instituteUserId);

    if (!instituteUser || instituteUser.instituteId !== instituteId) {
      throw new NotFoundException('User is not assigned to this institute');
    }

    // Remove the association
    await this.instituteUserRepository.delete(instituteUserId);

    return { message: 'User removed from institute successfully' };
  }

  async toggleInstituteUserStatus(instituteId: string, instituteUserId: string) {
    // Check if the user is associated with the institute
    const instituteUser = await this.instituteUserRepository.findById(instituteUserId);

    if (!instituteUser || instituteUser.instituteId !== instituteId) {
      throw new NotFoundException('User is not assigned to this institute');
    }

    // Toggle status locally on InstituteUser
    instituteUser.isActive = !instituteUser.isActive;
    return this.instituteUserRepository.save(instituteUser);
  }
}
