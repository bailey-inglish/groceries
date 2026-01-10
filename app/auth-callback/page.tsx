'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'

export default function AuthCallback() {
  const router = useRouter()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    async function handleAuthCallback() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError.message)
          toast.error('Login failed. Try again.', { duration: 5000 })
          router.replace('/')
          return
        }

        const user = data.session?.user
        if (!user) {
          toast.error('No session found. Please try logging in again.', { duration: 5000 })
          router.replace('/')
          return
        }

        toast.success(`Welcome back!`, { duration: 3000 })
        router.replace('/home')
      } catch (err: any) {
        console.error('Auth callback error:', err)
        toast.error('Unexpected error occurred.', { duration: 5000 })
        router.replace('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
      <Toaster position="bottom-right" />
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-gray-600 font-medium">Signing you in...</p>
      </div>
    </div>
  )
}
