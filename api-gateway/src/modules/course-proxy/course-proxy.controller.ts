import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CourseProxyService } from './course-proxy.service';
import { Roles } from '../../core/decorators/roles.decorator';
import { Role } from '../../core/enums/role.enum';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Courses')
@Controller('api/courses')
export class CourseProxyController {
  constructor(private readonly courseProxyService: CourseProxyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all courses (Public)' })
  @ApiResponse({ status: 200, description: 'Returns list of all courses' })
  async findAll(@Query() query: any, @Headers() headers: any) {
    return this.courseProxyService.proxyRequest('GET', '', { query, headers });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID (Public)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Returns course details' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(
    @Param('id') id: string,
    @Query() query: any,
    @Headers() headers: any,
  ) {
    return this.courseProxyService.proxyRequest('GET', `/${id}`, {
      query,
      headers,
    });
  }

  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create course (Admin/Instructor only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Instructor role required',
  })
  async create(@Body() body: any, @Headers() headers: any) {
    return this.courseProxyService.proxyRequest('POST', '', { body, headers });
  }

  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update course (Admin/Instructor only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Instructor role required',
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    return this.courseProxyService.proxyRequest('PUT', `/${id}`, {
      body,
      headers,
    });
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete course (Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id') id: string, @Headers() headers: any) {
    return this.courseProxyService.proxyRequest('DELETE', `/${id}`, {
      headers,
    });
  }
}
