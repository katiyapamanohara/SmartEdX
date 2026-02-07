import { Controller, All, Param, Req, Body, Headers, RequestMethod } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstituteProxyService } from './institute-proxy.service';
import { Request } from 'express';

@ApiTags('Institutes')
@Controller('api/institutes')
export class InstituteProxyController {
  constructor(private readonly instituteProxyService: InstituteProxyService) {}

  @All('*')
  @ApiOperation({ summary: 'Proxy all institute requests' })
  async proxy(
    @Param('0') path: string,
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    // When using * wildcard, the captured path is usually passed as the parameter
    // If path is undefined (root match), treat as empty string
    const targetPath = path || '0'; 
    const method = req.method;
    
    // If targetPath is '0' (wildcard not matched/empty), treat as empty string
    const finalPath = targetPath === '0' ? '' : targetPath;

    return this.instituteProxyService.forwardRequest(finalPath, method, body, headers);
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
