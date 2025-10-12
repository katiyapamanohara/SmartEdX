import {
  All,
  Controller,
  Req,
  Res,
  HttpException,
  Param,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiParam, 
  ApiBearerAuth,
  ApiSecurity 
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GatewayService } from '../services/gateway.service';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Gateway - Microservices Proxy')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private readonly gatewayService: GatewayService) {}

  // Quiz service routes
  @All('quiz/*')
  @ApiOperation({ 
    summary: 'Proxy to Quiz Service',
    description: 'Forwards all quiz-related requests to the Quiz microservice. Requires authentication.'
  })
  async proxyQuiz(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.proxyToService('quiz', req, res);
  }

  // User service routes (separate from built-in users module)
  @All('user-service/*')
  @ApiOperation({ 
    summary: 'Proxy to User Service',
    description: 'Forwards all user service requests. Requires authentication.'
  })
  async proxyUser(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.proxyToService('user', req, res);
  }

  // Analytics service routes - Admin only
  @All('analytics/*')
  @Roles('1') // Role ID 1 = Admin
  @ApiOperation({ 
    summary: 'Proxy to Analytics Service',
    description: 'Forwards all analytics requests. Requires admin role.'
  })
  async proxyAnalytics(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.proxyToService('analytics', req, res);
  }

  // Generic proxy handler
  private async proxyToService(
    serviceName: string,
    req: Request,
    res: Response,
  ) {
    const startTime = Date.now();
    
    try {
      // Extract user info from request (added by JWT guard)
      const user = (req as any).user;
      
      // Log user making the request
      if (user) {
        this.logger.log(
          `User ${user.id} (${user.email}) accessing ${serviceName} service`,
        );
      }
      
      const result = await this.gatewayService.forwardToService(serviceName, req);

      // Forward selected headers
      Object.entries(result.headers || {}).forEach(([k, v]) => {
        const key = k.toLowerCase();
        if (['transfer-encoding', 'content-length', 'connection'].includes(key)) {
          return;
        }
        if (typeof v === 'string') res.setHeader(k, v);
      });

      // Add custom gateway headers
      res.setHeader('X-Gateway-Service', serviceName);
      res.setHeader('X-Response-Time', `${result.responseTime}ms`);
      if (user) {
        res.setHeader('X-User-ID', user.id.toString());
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `${req.method} ${req.originalUrl} -> ${serviceName} [${result.status}] (${totalTime}ms)`,
      );

      res.status(result.status);
      return result.data;
    } catch (e: any) {
      const totalTime = Date.now() - startTime;
      
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${serviceName} [ERROR] (${totalTime}ms): ${e.message}`,
      );

      if (e instanceof HttpException) throw e;
      
      const status = e?.response?.status || 502;
      const message =
        e?.response?.data?.message || e?.message || 'Bad Gateway';
      throw new HttpException({ message }, status);
    }
  }
}
