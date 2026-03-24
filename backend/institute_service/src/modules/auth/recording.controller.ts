import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { RecordingService } from './recording.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { UpdateRecordingDto } from './dto/update-recording.dto';
import { AssignRecordingDto } from './dto/assign-recording.dto';
import { CreateRecordingCategoryDto } from './dto/create-recording-category.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Recordings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('institutes/:id/recordings')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  // ── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all recording categories for the institute' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  getCategories(@Param('id') instituteId: string) {
    return this.recordingService.getCategories(instituteId);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new recording category' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  createCategory(
    @Param('id') instituteId: string,
    @Body() dto: CreateRecordingCategoryDto,
  ) {
    return this.recordingService.createCategory(instituteId, dto);
  }

  @Delete('categories/:categoryId')
  @ApiOperation({ summary: 'Delete a recording category' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  deleteCategory(
    @Param('id') instituteId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.recordingService.deleteCategory(instituteId, categoryId);
  }

  // ── Recordings ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all recordings (with optional search & category filter)' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  getRecordings(
    @Param('id') instituteId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.recordingService.getRecordings(instituteId, { search, categoryId });
  }

  @Get(':recordingId')
  @ApiOperation({ summary: 'Get a single recording' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  getRecording(
    @Param('id') instituteId: string,
    @Param('recordingId') recordingId: string,
  ) {
    return this.recordingService.getRecordingById(instituteId, recordingId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a recording (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @UseInterceptors(FileInterceptor('file'))
  createRecording(
    @Param('id') instituteId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRecordingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.recordingService.createRecording(instituteId, userId, dto, file);
  }

  @Patch(':recordingId')
  @ApiOperation({ summary: 'Update recording title or category' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  updateRecording(
    @Param('id') instituteId: string,
    @Param('recordingId') recordingId: string,
    @Body() dto: UpdateRecordingDto,
  ) {
    return this.recordingService.updateRecording(instituteId, recordingId, dto);
  }

  @Delete(':recordingId')
  @ApiOperation({ summary: 'Delete a recording and its storage file' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  deleteRecording(
    @Param('id') instituteId: string,
    @Param('recordingId') recordingId: string,
  ) {
    return this.recordingService.deleteRecording(instituteId, recordingId);
  }

  // ── Course assignments ─────────────────────────────────────────────────────

  @Post(':recordingId/assignments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a recording to a course with a deadline' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  assignToCourse(
    @Param('id') instituteId: string,
    @Param('recordingId') recordingId: string,
    @Body() dto: AssignRecordingDto,
  ) {
    return this.recordingService.assignToCourse(instituteId, recordingId, dto);
  }

  @Delete(':recordingId/assignments/:assignmentId')
  @ApiOperation({ summary: 'Remove a course assignment from a recording' })
  @ApiParam({ name: 'id', description: 'Institute ID' })
  @ApiParam({ name: 'recordingId', description: 'Recording ID' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  removeAssignment(
    @Param('id') instituteId: string,
    @Param('recordingId') recordingId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.recordingService.removeAssignment(instituteId, recordingId, assignmentId);
  }
}
