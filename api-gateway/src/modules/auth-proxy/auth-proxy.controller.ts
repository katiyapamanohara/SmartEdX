import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  Delete,
  UseInterceptors,
  UploadedFile,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AuthProxyService } from './auth-proxy.service';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthProxyController {
  constructor(private readonly authProxyService: AuthProxyService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user (proxied to SaaS service)' })
  async register(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/register', 'POST', body, headers);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user (proxied to SaaS service)' })
  async login(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/login', 'POST', body, headers);
  }

  @Post('firebase/register')
  @ApiOperation({ summary: 'Register with Firebase (proxied to SaaS service)' })
  async firebaseRegister(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/firebase/register', 'POST', body, headers);
  }

  @Post('firebase/login')
  @ApiOperation({ summary: 'Login with Firebase (proxied to SaaS service)' })
  async firebaseLogin(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/firebase/login', 'POST', body, headers);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile (proxied to SaaS service)' })
  async getProfile(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/me', 'GET', null, headers);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate token (proxied to SaaS service)' })
  async validateToken(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/validate', 'GET', null, headers);
  }

  @Post('complete-onboarding')
  @ApiOperation({ summary: 'Complete onboarding (proxied to SaaS service)' })
  async completeOnboarding(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/complete-onboarding', 'POST', body, headers);
  }

  @Post('admin')
  @ApiOperation({ summary: 'Create admin (proxied to SaaS service)' })
  async createAdmin(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/admin', 'POST', body, headers);
  }

  @Get('admins')
  @ApiOperation({ summary: 'Get all admins (proxied to SaaS service)' })
  async getAllAdmins(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/admins', 'GET', null, headers);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (proxied to SaaS service)' })
  async getAllUsers(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/users', 'GET', null, headers);
  }

  @Patch('users/:userId/toggle-status')
  @ApiOperation({ summary: 'Toggle user status (proxied to SaaS service)' })
  async toggleUserStatus(@Param('userId') userId: string, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/users/${userId}/toggle-status`, 'PATCH', null, headers);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password (proxied to SaaS service)' })
  async resetPassword(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/reset-password', 'POST', body, headers);
  }

  @Get('seed')
  @ApiOperation({ summary: 'Run seed (proxied to SaaS service)' })
  async runSeed(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/seed', 'GET', null, headers);
  }

  @Get('institutes')
  @ApiOperation({ summary: 'Get current user institutes (proxied to SaaS service)' })
  async getInstitutes(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/institutes', 'GET', null, headers);
  }

  @Get('institutes/:id')
  @ApiOperation({ summary: 'Get institute details by ID (proxied to SaaS service)' })
  async getInstitute(@Param('id') id: string, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/institutes/${id}`, 'GET', null, headers);
  }

  @Post('institutes')
  @ApiOperation({ summary: 'Create a new institute (proxied to SaaS service)' })
  async createInstitute(@Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/institutes', 'POST', body, headers);
  }

  @Patch('institutes/:id/features')
  @ApiOperation({ summary: 'Update institute plan and features (proxied to SaaS service)' })
  async updateInstituteFeatures(@Param('id') id: string, @Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/institutes/${id}/features`, 'PATCH', body, headers);
  }

  @Patch('institutes/:id/users/:userId/toggle-status')
  @ApiOperation({ summary: 'Toggle institute user status (proxied to SaaS service)' })
  async toggleInstituteUserStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Headers() headers: any,
  ) {
    return this.authProxyService.forwardRequest(
      `auth/institutes/${id}/users/${userId}/toggle-status`,
      'PATCH',
      null,
      headers,
    );
  }

  @Patch('institutes/:id')
  @ApiOperation({ summary: 'Update institute details (proxied to SaaS service)' })
  async updateInstitute(@Param('id') id: string, @Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/institutes/${id}`, 'PATCH', body, headers);
  }

  @Delete('institutes/:id')
  @ApiOperation({ summary: 'Delete an institute (proxied to SaaS service)' })
  async deleteInstitute(@Param('id') id: string, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/institutes/${id}`, 'DELETE', null, headers);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles (proxied to SaaS service)' })
  async getRoles(@Headers() headers: any) {
    return this.authProxyService.forwardRequest('auth/roles', 'GET', null, headers);
  }

  @Post('institutes/:id/assign-user')
  @ApiOperation({ summary: 'Assign user to institute (proxied to SaaS service)' })
  async assignUser(@Param('id') id: string, @Body() body: any, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/institutes/${id}/assign-user`, 'POST', body, headers);
  }

  @Get('institutes/:id/users')
  @ApiOperation({ summary: 'Get institute users (proxied to SaaS service)' })
  async getInstituteUsers(@Param('id') id: string, @Headers() headers: any) {
    return this.authProxyService.forwardRequest(`auth/institutes/${id}/users`, 'GET', null, headers);
  }

  @Delete('institutes/:id/users/:userId')
  @ApiOperation({ summary: 'Remove user from institute (proxied to SaaS service)' })
  async deleteInstituteUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Headers() headers: any,
  ) {
    return this.authProxyService.forwardRequest(
      `auth/institutes/${id}/users/${userId}`,
      'DELETE',
      null,
      headers,
    );
  }

  @Post('institutes/:id/logo')
  @ApiOperation({ summary: 'Upload institute logo (proxied to SaaS service)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers() headers: any,
  ) {
    // We need to reconstruct the formData for the forwarded request
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
    });

    // Forward request with custom headers for form-data
    return this.authProxyService.forwardRequest(
        `auth/institutes/${id}/logo`, 
        'POST', 
        form, 
        {
            ...headers,
            ...form.getHeaders(), // Add multipart boundary headers
        }
    );
  }
}
