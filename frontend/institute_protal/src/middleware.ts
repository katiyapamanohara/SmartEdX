import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // 1. Allow essential public assets and system routes
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

  // 3. User is NOT logged in
  if (!token) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    
    // Redirect to institute-specific signin if we have an institute context in the URL
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

  // 4. User IS logged in
  // If they are on a public route or just the institute root, send them to the dashboard
  if (isPublicRoute || (pathParts.length === 2 && instituteId && instituteId !== 'signin')) {
    if (instituteId && instituteId !== 'signin' && instituteId !== 'dashboard') {
      const url = request.nextUrl.clone();
      url.pathname = `/${instituteId}/dashboard`;
      return NextResponse.redirect(url);
    }
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
