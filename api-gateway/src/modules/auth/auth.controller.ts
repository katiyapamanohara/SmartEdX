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
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../core/decorators/public.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '../../core/enums/role.enum';
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
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
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

  // Admin Management Endpoints
  @Roles(Role.ADMIN)
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

  @Roles(Role.ADMIN)
  @Get('admin/list')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all admin users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns list of all admins' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAllAdmins() {
    const admins = await this.seedService.getAllAdmins();
    return {
      count: admins.length,
      admins,
    };
  }

  @Roles(Role.ADMIN)
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

  @Roles(Role.ADMIN)
  @Post('admin/reset-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.seedService.resetPassword(
      resetPasswordDto.userId,
      resetPasswordDto.newPassword,
    );
    return {
      message: 'Password reset successfully',
    };
  }

  @Roles(Role.ADMIN)
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
