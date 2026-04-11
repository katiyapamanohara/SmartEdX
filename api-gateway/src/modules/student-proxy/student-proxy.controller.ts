import { Controller, All, Param, Req, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StudentProxyService } from './student-proxy.service';
import { Request } from 'express';

@ApiTags('Students')
@Controller('api/students')
export class StudentProxyController {
  constructor(private readonly studentProxyService: StudentProxyService) {}

  @All('*')
  @ApiOperation({ summary: 'Proxy all student requests' })
  async proxy(
    @Param('0') path: string,
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    // If path is undefined (root match), treat as empty string
    const targetPath = path || '0';
    const method = req.method;

    // If targetPath is '0' (wildcard not matched/empty), treat as empty string
    const finalPath = targetPath === '0' ? '' : targetPath;

    return this.studentProxyService.forwardRequest(
      finalPath,
      method,
      body,
      headers,
    );
  }

  @All()
  @ApiOperation({ summary: 'Proxy root student request' })
  async proxyRoot(
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const method = req.method;
    return this.studentProxyService.forwardRequest('', method, body, headers);
  }
}
