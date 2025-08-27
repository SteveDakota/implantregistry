import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/api/auth/send-magic-link',
    '/api/auth/verify',
    '/api/auth/verify-email',
    '/api/auth/dentist-login',
    '/api/patient/register',
    '/api/patient/complete-setup',
    '/api/dentist/register',
    '/patient/setup'
  ]

  // Check if this is a public route
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next()
  }

  // Routes that require specific user types
  const dentistRoutes = ['/dentist/dashboard', '/api/dentist/', '/api/admin/', '/api/blockchain/']
  const patientRoutes = ['/patient/dashboard', '/api/patient/']

  const isDentistRoute = dentistRoutes.some(route => pathname.startsWith(route))
  const isPatientRoute = patientRoutes.some(route => pathname.startsWith(route))

  // If this is not a protected route, allow access
  if (!isDentistRoute && !isPatientRoute) {
    return NextResponse.next()
  }

  // Check for authentication token
  const authToken = request.cookies.get('auth-token')?.value

  if (!authToken) {
    if (isDentistRoute) {
      return NextResponse.redirect(new URL('/dentist', request.url))
    }
    if (isPatientRoute) {
      return NextResponse.redirect(new URL('/patient', request.url))
    }
  }

  try {
    // Verify JWT token
    if (!authToken) {
      throw new Error('No auth token')
    }
    const { payload } = await jwtVerify(authToken, secret)
    const userData = payload as any
    
    // Check user type matches route type
    if (isDentistRoute && userData.userType !== 'dentist') {
      const response = NextResponse.redirect(new URL('/dentist', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    if (isPatientRoute && userData.userType !== 'patient') {
      const response = NextResponse.redirect(new URL('/patient', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    // Token is valid and user type matches
    return NextResponse.next()

  } catch (error) {
    console.error('Authentication error:', error)
    
    // Invalid token - clear it and redirect to login
    let response
    if (isDentistRoute) {
      response = NextResponse.redirect(new URL('/dentist', request.url))
    } else if (isPatientRoute) {
      response = NextResponse.redirect(new URL('/patient', request.url))
    } else {
      response = NextResponse.redirect(new URL('/', request.url))
    }
    
    response.cookies.delete('auth-token')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}