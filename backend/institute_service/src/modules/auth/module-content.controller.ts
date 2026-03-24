import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ModuleContentService } from './module-content.service';
import { CreateModuleContentDto } from './dto/create-module-content.dto';
import { UpdateModuleContentDto } from './dto/update-module-content.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('institutes/:id/courses/:courseId/modules/:moduleId/contents')
@UseGuards(JwtAuthGuard)
export class ModuleContentController {
  constructor(private readonly moduleContentService: ModuleContentService) {}

  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.moduleContentService.createWithFileUpload(courseId, moduleId, file, body);
  }

  @Post()
  create(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() createDto: CreateModuleContentDto
  ) {
    return this.moduleContentService.create(courseId, moduleId, createDto);
  }

  @Get()
  findAll(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.moduleContentService.findAllByModuleId(courseId, moduleId);
  }

  @Get(':contentId')
  findOne(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('contentId') contentId: string
  ) {
    return this.moduleContentService.findOne(courseId, moduleId, contentId);
  }

  @Patch(':contentId')
  update(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('contentId') contentId: string,
    @Body() updateDto: UpdateModuleContentDto
  ) {
    return this.moduleContentService.update(courseId, moduleId, contentId, updateDto);
  }

  @Delete(':contentId')
  remove(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('contentId') contentId: string
  ) {
    return this.moduleContentService.remove(courseId, moduleId, contentId);
  }
}
