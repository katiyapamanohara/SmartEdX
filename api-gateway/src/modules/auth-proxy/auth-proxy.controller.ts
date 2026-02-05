import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
}
