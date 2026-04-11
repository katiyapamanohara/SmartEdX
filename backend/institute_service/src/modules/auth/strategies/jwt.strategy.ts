import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { InstituteUserRepository } from '../../../infra/database/repositories';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly instituteUserRepository: InstituteUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      !payload.instituteId
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check the user is still active in the database on every request
    const user = await this.instituteUserRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Account is deactivated. Please contact your administrator.',
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      instituteId: payload.instituteId,
    };
  }
}
