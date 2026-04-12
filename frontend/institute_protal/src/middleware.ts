import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// JWT Payload interface
interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  instituteId: string;
  type: string;
  iat: number;
  exp: number;
}

// Helper function to decode JWT token
function decodeToken(token: string): JWTPayload | null {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error('Failed to decode JWT token in middleware:', error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  // 2. Extract instituteId if present (matches /:instituteId/...)
  const pathParts = pathname.split('/');
  const instituteId = pathParts[1];
  
  // A route is "public" if it's the root, a generic signin, or an institute-specific signin
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/signin' || 
    pathname.endsWith('/signin');

  const isCoursesRoute = pathname.endsWith('/courses') || pathname.includes('/courses/');

 
  if (!token) {
    if (isPublicRoute || isCoursesRoute) {
      return NextResponse.next();
    }
    
   
    if (instituteId && instituteId !== 'signin' && instituteId !== 'dashboard' && instituteId !== 'error-404') {
      const url = request.nextUrl.clone();
      url.pathname = `/${instituteId}/signin`;
      return NextResponse.redirect(url);
    }

    // Fallback to generic signin
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    return NextResponse.redirect(url);
  }

  // Extract role and instituteId from JWT token payload (primary source)
  const decoded = decodeToken(token);
  const userRole = decoded?.role || request.cookies.get('user_role')?.value;
  const userInstituteId = decoded?.instituteId;

  // Strict Institute Check: If we are in an institute route, user MUST belong to that institute
  if (instituteId && instituteId !== 'signin' && instituteId !== 'dashboard' && instituteId !== 'error-404' && !isCoursesRoute) {
     if (userInstituteId && userInstituteId !== instituteId) {
        console.warn(`Middleware: Institute mismatch. User ${userInstituteId} tried to access ${instituteId}`);
        const url = request.nextUrl.clone();
        
        // Redirect to their CORRECT dashboard
        if (userRole === 'instructor') {
            url.pathname = `/${userInstituteId}/institute`;
        } else if (userRole === 'student') {
            url.pathname = `/${userInstituteId}/student`;
        } else if (userRole === 'teacher') {
            url.pathname = `/${userInstituteId}/teacher`;
        } else {
             url.pathname = `/${userInstituteId}/dashboard`;
        }
        return NextResponse.redirect(url);
     }
  }

  const roleBasePath = pathParts[2]; 
  
  if (instituteId && roleBasePath && userRole) {
    const rolePathMap: Record<string, string> = {
      'instructor': 'institute',
      'student': 'student',
      'teacher': 'teacher'
    };
    
    const allowedPath = rolePathMap[userRole];
    
    if (['institute', 'student', 'teacher'].includes(roleBasePath) && roleBasePath !== allowedPath) {
      const url = request.nextUrl.clone();
      url.pathname = `/${instituteId}/${allowedPath}`;
      return NextResponse.redirect(url);
    }
  }
  
  if (isPublicRoute || (pathParts.length === 2 && instituteId && instituteId !== 'signin')) {
    if (instituteId && instituteId !== 'signin' ) {
      const url = request.nextUrl.clone();
      
      if (userRole === 'instructor') {
        url.pathname = `/${instituteId}/institute`;
      } else if (userRole === 'student') {
        url.pathname = `/${instituteId}/student`;
      } else if (userRole === 'teacher') {
        url.pathname = `/${instituteId}/teacher`;
      } else {
        url.pathname = `/`;
      }
      
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [

    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
