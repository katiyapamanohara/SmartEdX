import { Controller, Post, Body, Get, UseGuards, Patch, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { FirebaseLoginDto, FirebaseRegisterDto } from './dto/firebase-auth.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { Public } from '../../core/decorators/public.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SeedService } from './services/seed.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly seedService: SeedService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Firebase Authentication Endpoints
  @Public()
  @Post('firebase/register')
  @ApiOperation({ summary: 'Register a new user with Firebase' })
  @ApiBody({ type: FirebaseRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered with Firebase',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 401, description: 'Invalid Firebase token' })
  async firebaseRegister(@Body() firebaseRegisterDto: FirebaseRegisterDto) {
    return this.authService.firebaseRegister(firebaseRegisterDto);
  }

  @Public()
  @Post('firebase/login')
  @ApiOperation({ summary: 'Login user with Firebase' })
  @ApiBody({ type: FirebaseLoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in with Firebase',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or Firebase token' })
  async firebaseLogin(@Body() firebaseLoginDto: FirebaseLoginDto) {
    return this.authService.firebaseLogin(firebaseLoginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user information',
    schema: {
      example: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        role: 'student',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    const userDetails = await this.authService.findById(user.userId);
    if (!userDetails) {
      return null;
    }
    const { password, ...result } = userDetails;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      example: {
        valid: true,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async validateToken(@CurrentUser() user: any) {
    const userDetails = await this.authService.validateUser(user.userId);
    return {
      valid: true,
      user: userDetails,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete-onboarding')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Complete user onboarding' })
  @ApiBody({ type: CompleteOnboardingDto })
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed successfully',
    schema: {
      example: {
        message: 'Onboarding completed successfully',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          isNew: false,
        },
      },
    },
  })
  async completeOnboarding(
    @CurrentUser() user: any,
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ) {
    const updatedUser = await this.authService.completeOnboarding(
      user.userId,
      completeOnboardingDto,
    );
    return {
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isNew: updatedUser.isNew,
      },
    };
  }

  // Admin Management Endpoints
  @Roles('admin')
  @Post('admin/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new admin user (Admin only)' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 400, description: 'User already exists' })
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    const user = await this.seedService.createAdminUser(
      createAdminDto.firstName,
      createAdminDto.lastName,
      createAdminDto.email,
      createAdminDto.password,
    );

    return {
      message: 'Admin user created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  @Roles('admin')
  @Get('admin/list')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all admin users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all admins',
    schema: {
      example: {
        count: 2,
        admins: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            firstName: 'System',
            lastName: 'Administrator',
            email: 'admin@gmail.com',
            role: 'admin',
            isActive: true,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAllAdmins() {
    const admins = await this.seedService.getAllAdmins();
    return {
      count: admins.length,
      admins,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users excluding system admin (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all users excluding admin@gmail.com',
   
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAllUsers() {
    const users = await this.authService.getAllUsers();
    return {
      count: users.length,
      users,
    };
  }

  @Roles('admin')
  @Patch('admin/toggle-status/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle user active status (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User status toggled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleUserStatus(@Param('userId') userId: string) {
    const user = await this.seedService.toggleUserStatus(userId);
    return {
      message: 'User status updated successfully',
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
    };
  }

  @Roles('admin')
  @Post('admin/reset-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot reset password for student accounts' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.seedService.resetPassword(
      resetPasswordDto.userId,
      resetPasswordDto.newPassword,
    );
    return {
      message: 'Password reset successfully',
    };
  }

  @Roles('admin')
  @Post('seed/run')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually run seed process (Admin only)' })
  @ApiResponse({ status: 200, description: 'Seed process completed' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async runSeed() {
    await this.seedService.seedAdminUsers();
    return {
      message: 'Seed process completed successfully',
    };
  }
}
