import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "easygroceries-change-this-secret-in-production",
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        try {
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user) return null

          const valid = await bcrypt.compare(password, user.passwordHash)
          if (!valid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            onboardingCompleted: user.onboardingCompleted,
          }
        } catch (error) {
          console.error("Authorize error:", error)
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? token.sub
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false
      }
      // Allow client-side session.update() to push onboardingCompleted into the token
      if (trigger === "update" && typeof session?.onboardingCompleted === "boolean") {
        token.onboardingCompleted = session.onboardingCompleted
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id ?? token.sub) as string
        ;(session.user as { onboardingCompleted?: boolean }).onboardingCompleted =
          (token.onboardingCompleted as boolean | undefined) ?? false
      }
      return session
    },
  },
})
