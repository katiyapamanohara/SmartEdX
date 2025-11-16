import { Role } from '../../../core/enums/role.enum';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
