export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string; // Role name (admin, instructor, student)
  instituteId: string;
  iat?: number;
  exp?: number;
}
