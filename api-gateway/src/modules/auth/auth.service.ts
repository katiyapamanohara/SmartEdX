import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from './entities/user.entity';
import { UserRepository, RoleRepository } from '../../infra/database/repositories';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

      // Get student role (default for registration)
      const studentRole = await this.roleRepository.findByName('student');
      if (!studentRole) {
        throw new Error('Student role not found');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Create user
      const savedUser = await this.userRepository.create({
        ...registerDto,
        password: hashedPassword,
        roleId: studentRole.id,
      });

      // Generate JWT token
      const token = this.generateToken({
        sub: savedUser.id,
        email: savedUser.email,
        role: savedUser.role.name,
      });

      return {
        access_token: token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role.name,
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
}
