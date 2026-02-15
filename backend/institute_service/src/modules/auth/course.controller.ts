import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Courses')
@Controller('institutes/:id/courses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiBody({ type: CreateCourseDto })
  async createCourse(
    @Param('id') instituteId: string,
    @Body() createDto: CreateCourseDto,
  ) {
    return this.courseService.createCourse(instituteId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses for an institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getCourses(@Param('id') instituteId: string) {
    return this.courseService.getCourses(instituteId);
  }

  @Patch(':courseId')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiBody({ type: UpdateCourseDto })
  async updateCourse(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Body() updateDto: UpdateCourseDto,
  ) {
    return this.courseService.updateCourse(instituteId, courseId, updateDto);
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  async deleteCourse(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.courseService.deleteCourse(instituteId, courseId);
  }
}
