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
