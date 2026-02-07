import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes
  // Allow /signin (old) or /[instituteId]/signin
  if (pathname === '/signin' || pathname === '/' || pathname.endsWith('/signin') || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  // Protect /[instituteId] routes
  if (!token) {
     const url = request.nextUrl.clone();
     // Redirect to generic signin if no institute context, or maybe we want to keep them on the current URL but show auth?
     // For now, let's redirect to a generic signin or keep it simple.
     // But wait, if they are at /[id]/dashboard and not logged in, we should redirect to /[id]/signin
     
     // Extract instituteId from pathname if possible
     const parts = pathname.split('/');
     if (parts.length > 1 && parts[1]) {
        const instituteId = parts[1];
        // simple check if it looks like an ID
        if (instituteId !== 'signin' && instituteId !== 'error-404') {
             url.pathname = `/${instituteId}/signin`;
             return NextResponse.redirect(url);
        }
     }

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
