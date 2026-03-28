import { Controller, All, Post, Param, Req, Body, Headers, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { InstituteProxyService } from './institute-proxy.service';
import { Request } from 'express';

@ApiTags('Institutes')
@Controller('api/institutes')
export class InstituteProxyController {
  constructor(private readonly instituteProxyService: InstituteProxyService) {}

  // ── Module content file upload (PDF / document / video) ────────
  @Post('institutes/:id/courses/:courseId/modules/:moduleId/contents/upload-file')
  @ApiOperation({ summary: 'Upload a file as module content (PDF, document, video)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadContent(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const path = `institutes/${id}/courses/${courseId}/modules/${moduleId}/contents/upload-file`;
    return this.instituteProxyService.forwardFileUpload(path, file, body, headers);
  }

  // ── Teacher module content file upload ────────────────────────────────────
  @Post('institutes/:id/courses/:courseId/teacher-modules/:moduleId/contents/upload-file')
  @ApiOperation({ summary: 'Teacher uploads a file as module content (PDF, document, video)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTeacherContent(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const path = `institutes/${id}/courses/${courseId}/teacher-modules/${moduleId}/contents/upload-file`;
    return this.instituteProxyService.forwardFileUpload(path, file, body, headers);
  }

  // ── Recording file upload ─────────────────────────────────────────────────
  @Post('institutes/:id/recordings')
  @ApiOperation({ summary: 'Upload a recording video (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRecording(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const path = `institutes/${id}/recordings`;
    return this.instituteProxyService.forwardFileUpload(path, file, body, headers);
  }

  @All('*')
  @ApiOperation({ summary: 'Proxy all institute requests' })
  async proxy(
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    // Manually extract path to ensure reliability
    // req.originalUrl includes query strings, so this handles them too? 
    // The forwardRequest method constructs URL as base + /api/ + path. 
    // If backend expects query params, we should pass them.
    // For now, let's just get the path.
    
    // originalUrl: /api/institutes/auth/firebase/login
    // We want: auth/firebase/login
    
    // Note: This assumes the controller is mounted at /api/institutes
    const prefix = '/api/institutes';
    let relativePath = req.originalUrl;
    
    if (relativePath.startsWith(prefix)) {
      relativePath = relativePath.slice(prefix.length);
    }
    
    // Remove leading slash if present
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1);
    }
    
    const method = req.method;
    return this.instituteProxyService.forwardRequest(relativePath, method, body, headers);
  }

  // Also catch root /api/institutes if needed (though usually list)
  @All()
  @ApiOperation({ summary: 'Proxy root institute request' })
  async proxyRoot(
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const method = req.method;
    return this.instituteProxyService.forwardRequest('', method, body, headers);
  }
}
