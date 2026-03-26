import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

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

  @Get('my-courses')
  @ApiOperation({ summary: 'Get courses assigned to the logged-in teacher' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getMyCourses(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.getMyCoursesForTeacher(instituteId, userId);
  }

  @Get('my-assessments')
  @ApiOperation({ summary: 'Get all quiz assessments from courses assigned to the logged-in teacher' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getMyAssessments(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.getMyAssessmentsForTeacher(instituteId, userId);
  }

  @Get('student-assessments')
  @ApiOperation({ summary: 'Get all quiz assessments from courses enrolled by the logged-in student' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getMyStudentAssessments(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.getMyAssessmentsForStudent(instituteId, userId);
  }

  @Post('student-assessments/:contentId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student submits quiz attempt with score' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'contentId', description: 'Quiz Content ID' })
  async submitStudentQuizAttempt(
    @Param('id') instituteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: {
    score: number;
    answers?: Record<string, number>;
    voiceResult?: {
      totalScore: number;
      totalMarks: number;
      grade: string;
      passed: boolean;
      overallFeedback: string;
      questionResults: Array<{
        questionId: string;
        question: string;
        studentAnswer: string;
        expectedAnswer: string;
        score: number;
        marksAvailable: number;
        percentage: number;
        feedback: string;
      }>;
    };
  },
  ) {
    return this.courseService.recordStudentQuizAttempt(instituteId, contentId, userId, body.score, body.answers, body.voiceResult);
  }

  @Get('my-enrolled-courses')
  @ApiOperation({ summary: 'Get courses the logged-in student is enrolled in' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  async getMyEnrolledCourses(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.getMyCoursesForStudent(instituteId, userId);
  }

  // ─── Teacher module CRUD ─────────────────────────────────────────
  @Post(':courseId/teacher-modules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Teacher creates a module in their assigned course' })
  async createTeacherModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { title: string; description?: string; order?: number },
  ) {
    return this.courseService.createModuleForTeacher(instituteId, courseId, userId, body);
  }

  @Patch(':courseId/teacher-modules/:moduleId')
  @ApiOperation({ summary: 'Teacher updates a module in their assigned course' })
  async updateTeacherModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { title?: string; description?: string; order?: number },
  ) {
    return this.courseService.updateModuleForTeacher(instituteId, courseId, moduleId, userId, body);
  }

  @Delete(':courseId/teacher-modules/:moduleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher deletes a module in their assigned course' })
  async deleteTeacherModule(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.deleteModuleForTeacher(instituteId, courseId, moduleId, userId);
  }

  // ─── Teacher content CRUD ─────────────────────────────────────────
  @Post(':courseId/teacher-modules/:moduleId/contents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Teacher creates content in their assigned course module' })
  async createTeacherContent(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: any,
  ) {
    return this.courseService.createContentForTeacher(instituteId, courseId, moduleId, userId, body);
  }

  @Patch(':courseId/teacher-modules/:moduleId/contents/:contentId')
  @ApiOperation({ summary: 'Teacher updates content in their assigned course module' })
  async updateTeacherContent(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('contentId') contentId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: any,
  ) {
    return this.courseService.updateContentForTeacher(instituteId, courseId, moduleId, contentId, userId, body);
  }

  @Delete(':courseId/teacher-modules/:moduleId/contents/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teacher deletes content in their assigned course module' })
  async deleteTeacherContent(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('contentId') contentId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.deleteContentForTeacher(instituteId, courseId, moduleId, contentId, userId);
  }

  @Post(':courseId/modules/:moduleId/teacher-quiz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Teacher creates a quiz assessment in their assigned course module' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  async createTeacherAssessment(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { title: string; description?: string; quizData: any },
  ) {
    return this.courseService.createAssessmentForTeacher(instituteId, courseId, moduleId, userId, body);
  }

  @Post(':courseId/teacher-assessment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Teacher creates a quiz assessment, optionally creating the module inline' })
  async createTeacherAssessmentSmart(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { moduleId?: string; moduleName?: string; title: string; description?: string; quizData: any },
  ) {
    return this.courseService.createAssessmentWithModuleForTeacher(instituteId, courseId, userId, body);
  }

  @Get(':courseId/for-teacher')
  @ApiOperation({ summary: 'Get a course with all modules and contents for the assigned teacher' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  async getCourseForTeacher(
    @Param('id') instituteId: string,
    @Param('courseId') courseId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.courseService.getCourseWithModulesForTeacher(instituteId, courseId, userId);
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
