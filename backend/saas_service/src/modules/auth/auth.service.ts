import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { FirebaseLoginDto, FirebaseRegisterDto } from './dto/firebase-auth.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from './entities/user.entity';
import { UserRepository, RoleRepository, InstituteRepository } from '../../infra/database/repositories';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly instituteRepository: InstituteRepository,
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
      // Find user by email
      const user = await this.userRepository.findByEmail(loginDto.email);

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
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  async validateUser(userId: string) {
    try {
      const user = await this.userRepository.findById(userId);

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
}
