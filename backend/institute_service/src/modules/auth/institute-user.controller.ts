import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { UpdateInstituteUserDto } from './dto/update-institute-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Institute Users')
@Controller('institutes/:id/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InstituteUserController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users in an institute, optionally filtered by role',
  })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role name (e.g. student, teacher, instructor)',
  })
  async getInstituteUsers(
    @Param('id') instituteId: string,
    @Query('role') role?: string,
  ) {
    return this.authService.getInstituteUsers(instituteId, role);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user in an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiBody({ type: CreateInstituteUserDto })
  async createInstituteUser(
    @Param('id') instituteId: string,
    @Body() createDto: CreateInstituteUserDto,
  ) {
    return this.authService.createInstituteUser(instituteId, createDto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update a user in an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: UpdateInstituteUserDto })
  async updateInstituteUser(
    @Param('id') instituteId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateInstituteUserDto,
  ) {
    return this.authService.updateInstituteUser(instituteId, userId, updateDto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete a user from an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async deleteInstituteUser(
    @Param('id') instituteId: string,
    @Param('userId') userId: string,
  ) {
    return this.authService.deleteInstituteUser(instituteId, userId);
  }
  @Patch(':userId/toggle-status')
  @ApiOperation({ summary: 'Toggle user active status in an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  async toggleInstituteUserStatus(
    @Param('id') instituteId: string,
    @Param('userId') userId: string,
  ) {
    return this.authService.toggleInstituteUserStatus(instituteId, userId);
  }

  @Get(':userId/details')
  @ApiOperation({ summary: 'Get teacher/user details' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns teacher details' })
  async getTeacherDetails(
    @Param('id') instituteId: string,
    @Param('userId') userId: string,
  ) {
    return this.authService.getTeacherDetails(instituteId, userId);
  }
}
