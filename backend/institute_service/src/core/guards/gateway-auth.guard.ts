import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const gatewaySecret = request.headers['x-gateway-secret'];
    const expectedSecret = process.env.GATEWAY_SECRET;

    if (!expectedSecret) {
      throw new UnauthorizedException(
        'Gateway secret not configured on server',
      );
    }

    if (!gatewaySecret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '⚠️  Gateway authentication bypassed in development mode (Missing Header)',
        );
        return true;
      }
      throw new UnauthorizedException('Missing gateway authentication header');
    }

    if (gatewaySecret !== expectedSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '⚠️  Gateway authentication bypassed in development mode (Invalid Secret)',
        );
        return true;
      }
      throw new UnauthorizedException('Invalid gateway authentication');
    }

    return true;
  }
}
