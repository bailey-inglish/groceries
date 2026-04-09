import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user

  const isAuthPage =
    nextUrl.pathname.startsWith("/auth/signin") ||
    nextUrl.pathname.startsWith("/auth/signup")

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding")

  if (isApiAuthRoute) return NextResponse.next()

  if (isAuthPage) {
    // Let auth pages render to avoid redirect loops with stale cookies.
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", nextUrl)
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Gate non-onboarding pages behind onboarding completion.
  // onboardingCompleted is stored in the JWT token (set in auth.ts).
  if (!isOnboardingPage) {
    const onboardingCompleted = (req.auth as { user?: { onboardingCompleted?: boolean } })?.user?.onboardingCompleted
    if (onboardingCompleted === false) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (auth endpoints)
     * - .well-known (certificate files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth|.well-known).*)",
  ],
}


