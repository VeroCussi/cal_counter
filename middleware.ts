import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow health check without authentication
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // API routes - protect all except auth and health
  if (pathname.startsWith('/api/')) {
    const isAuthRoute = pathname.startsWith('/api/auth/');
    
    if (!isAuthRoute) {
      const authUser = getAuthUser(request);
      if (!authUser) {
        return NextResponse.json(
          { error: 'No autenticado' },
          { status: 401 }
        );
      }
    }
  }

  // Protected app routes
  if (pathname.startsWith('/today') || 
      pathname.startsWith('/foods') || 
      pathname.startsWith('/weight') || 
      pathname.startsWith('/settings')) {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/today/:path*',
    '/foods/:path*',
    '/weight/:path*',
    '/settings/:path*',
  ],
  runtime: 'nodejs', // Use Node.js runtime instead of Edge
};
