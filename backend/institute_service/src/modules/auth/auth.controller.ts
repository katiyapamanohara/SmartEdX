import { Controller, Post, Body, Get, UseGuards, Patch, Param, NotFoundException, Delete, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { FirebaseLoginDto } from './dto/firebase-auth.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { Public } from '../../core/decorators/public.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SeedService } from './services/seed.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly seedService: SeedService,
  ) {}




  // Firebase Authentication Endpoints
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
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.authService.getMyProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateMyProfileDto,
  ) {
    return this.authService.updateMyProfile(user.userId, updateDto);
  }

  // Admin Management Endpoints

  @Public()
  @Get('institutes/:id/info')
  @ApiOperation({ summary: 'Get public institute information' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns institute name, logo, and phone number',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Example Institute',
        logo: 'https://example.com/logo.png',
        phoneNumber: '+1234567890',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Institute not found' })
  async getInstituteInfo(@Param('id') id: string) {
    return this.authService.getInstituteInfo(id);
  }

  @Public()
  @Get('institutes/:id/voice-config')
  @ApiOperation({ summary: 'Get institute voice agent configuration' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns institute voice instructions and greeting for the voice agent',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Example Institute',
        voiceInstructions: 'You are a helpful AI assistant for Example Institute...',
        voiceGreeting: 'Hello! Welcome to Example Institute. How can I help you?',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Institute not found' })
  async getInstituteVoiceConfig(@Param('id') id: string) {
    return this.authService.getInstituteVoiceConfig(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('institutes/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get institute details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns specific institute information',
  })
  async getInstitute(@Param('id') id: string) {
    return this.authService.getInstituteById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('institutes/:id/teachers/count')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get total teacher count for an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns total teacher count',
    schema: { example: { count: 12 } },
  })
  async getTeacherCount(@Param('id') id: string) {
    return this.authService.getTeacherCount(id);
  }




  @UseGuards(JwtAuthGuard)
  @Delete('institutes/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiResponse({ status: 200, description: 'Institute deleted successfully' })
  async deleteInstitute(@Param('id') id: string, @CurrentUser() user: any) {
    return this.authService.deleteInstitute(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Returns list of all roles' })
  async getRoles() {
    return this.authService.getRoles();
  }

  @UseGuards(JwtAuthGuard)
  @Post('institutes/:id/assign-user')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign a user to an institute with a role' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiBody({ type: AssignUserDto })
  @ApiResponse({ status: 200, description: 'User assigned successfully' })
  async assignUser(
    @Param('id') id: string,
    @Body() assignUserDto: AssignUserDto,
  ) {
    return this.authService.assignUserToInstitute(id, assignUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('institutes/:id/users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all users assigned to an institute, optionally filtered by role' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role (student, teacher, instructor)' })
  @ApiResponse({ status: 200, description: 'Returns list of users' })
  async getInstituteUsers(
    @Param('id') id: string,
    @Query('role') role?: string,
  ) {
    return this.authService.getInstituteUsers(id, role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('institutes/:id/users/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a user from an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  async deleteInstituteUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.authService.deleteInstituteUser(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('institutes/:id/users/:userId/toggle-status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle user active status in an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  async toggleInstituteUserStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.authService.toggleInstituteUserStatus(id, userId);
  }



  @UseGuards(JwtAuthGuard)
  @Post('institutes/:id/logo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload institute logo' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadInstituteLogo(id, file);
  }
}
