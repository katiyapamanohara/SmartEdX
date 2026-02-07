import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes
  if (pathname === '/signin' || pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  // Protect /[instituteId] routes
  // Assuming instituteId is a UUID or specific format, but generally checking if it's not a public route
  // and we are trying to access dashboard-like pages.
  // Since we moved everything to [instituteId], we can check if token exists.
  
  if (!token) {
     const url = request.nextUrl.clone();
     url.pathname = '/signin';
     return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - signin (auth page)
     * - / (landing page if exists, or redirect to signin)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|signin|$).*)',
  ],
};
