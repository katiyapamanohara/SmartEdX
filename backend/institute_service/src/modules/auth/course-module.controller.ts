import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CourseModuleService } from './course-module.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Course Modules')
@Controller('institutes/:id/courses/:courseId/modules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CourseModuleController {
  constructor(private readonly courseModuleService: CourseModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new module for a course' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiBody({ type: CreateCourseModuleDto })
  async createModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Body() createDto: CreateCourseModuleDto,
  ) {
    return this.courseModuleService.createModule(instituteId, courseId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules for a course' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  async getModules(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.courseModuleService.getModulesByCourseId(instituteId, courseId);
  }

  @Get(':moduleId')
  @ApiOperation({ summary: 'Get a specific module by ID' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  async getModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.courseModuleService.getModuleById(instituteId, courseId, moduleId);
  }

  @Patch(':moduleId')
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiBody({ type: UpdateCourseModuleDto })
  async updateModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() updateDto: UpdateCourseModuleDto,
  ) {
    return this.courseModuleService.updateModule(instituteId, courseId, moduleId, updateDto);
  }

  @Delete(':moduleId')
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  async deleteModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.courseModuleService.deleteModule(instituteId, courseId, moduleId);
  }
}
