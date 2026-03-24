import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InstituteUserRepository } from '../../../infra/database/repositories';

/**
 * Auth guard for SSE endpoints where the JWT token is passed
 * as a query parameter (?token=...) because EventSource cannot set headers.
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly instituteUserRepository: InstituteUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token: string | undefined = req.query?.token;

    if (!token) throw new UnauthorizedException('Missing token');

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.instituteUserRepository.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Account inactive');

    // Attach same user shape as JwtStrategy.validate
    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      instituteId: payload.instituteId,
    };

    return true;
  }
}
