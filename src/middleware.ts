import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isAuthPage =
    nextUrl.pathname.startsWith("/auth/signin") ||
    nextUrl.pathname.startsWith("/auth/signup")

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")

  if (isApiAuthRoute) return NextResponse.next()

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", nextUrl)
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
}
