import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
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
