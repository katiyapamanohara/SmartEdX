import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Access denied',
        error: 'Forbidden',
      });
    }

    const hasRole = requiredRoles.some((role) => {
      if (user.role?.id) {
        return user.role.id.toString() === role;
      }
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException({
        statusCode: 403,
        message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        error: 'Forbidden',
      });
    }

    return true;
  }
}
