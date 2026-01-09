'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import { ShoppingCart, Mail, ArrowRight, Download } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        router.replace('/home')
      }
    }
    checkAuth()

    // Detect mobile
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setIsMobile(mobile)

    // Check if already installed as PWA
    const standalone = (window.navigator as any).standalone === true || 
                      window.matchMedia('(display-mode: standalone)').matches
    setIsInstalled(standalone)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setLoading(true)

    const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true

    try {
      if (isPwa || isMobile) {
        // For PWA/mobile: send OTP token (6-digit code)
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
          },
        })

        if (error) {
          if (error.message?.includes('only request this after')) {
            const match = error.message.match(/(\d+)\s+seconds/)
            const seconds = match ? match[1] : '60'
            toast.error(`Please wait ${seconds} seconds before requesting another code.`)
          } else {
            toast.error(error.message || 'Failed to send verification code')
          }
          setLoading(false)
          return
        }

        setOtpSent(true)
        setSentToEmail(email)
        toast.success('Check your email for a 6-digit code!')
      } else {
        // For desktop: send magic link
        const redirectUrl = 'https://easygroceries.vercel.app/auth-callback'
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        })

        if (error) {
          if (error.message?.includes('only request this after')) {
            const match = error.message.match(/(\d+)\s+seconds/)
            const seconds = match ? match[1] : '60'
            toast.error(`Please wait ${seconds} seconds before requesting another link.`)
          } else {
            toast.error(error.message || 'Failed to send login link')
          }
          setLoading(false)
          return
        }

        setMagicLinkSent(true)
        setSentToEmail(email)
        toast.success('Check your email for the magic link!')
      }
    } catch (err: any) {
      toast.error('Unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtpCode = async () => {
    if (!otpCode.trim() || !sentToEmail) return
    
    setVerifyingOtp(true)

    try {
      const { error, data } = await supabase.auth.verifyOtp({
        email: sentToEmail,
        token: otpCode.trim(),
        type: 'email',
      })

      if (error) {
        toast.error('Invalid or expired code. Try again.')
        setVerifyingOtp(false)
        return
      }

      toast.success('Signed in successfully!')
      router.replace('/home')
    } catch (err: any) {
      toast.error('Verification failed')
      setVerifyingOtp(false)
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false)
      setIsInstalled(true)
      toast.success('App installed successfully!')
    }
    
    setDeferredPrompt(null)
  }

  const currentUrl = 'https://easygroceries.vercel.app'

  // Desktop view - show website URL
  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Toaster position="top-center" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EasyGroceries</h1>
          <p className="text-gray-600 mb-8">
            Smart grocery inventory for your phone
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-sm text-gray-600 mb-3 font-medium">Visit on mobile:</p>
            <code className="block text-blue-600 font-mono text-sm break-all">
              easygroceries.vercel.app
            </code>
          </div>
          
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold mt-0.5">1</div>
              <span>Open the link on your phone</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold mt-0.5">2</div>
              <span>Install as an app or use in browser</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold mt-0.5">3</div>
              <span>Start tracking your groceries!</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mobile - not installed - show install prompt
  if (!isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Toaster position="top-center" />
        
        {/* Top spacing */}
        <div className="flex-1" />
        
        {/* Content */}
        <div className="px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
            
            {/* Heading */}
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
              EasyGroceries
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Track inventory, predict needs
            </p>

            {/* Install card */}
            {showInstallPrompt && deferredPrompt ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2 font-medium">📱 Install this app</p>
                  <p className="text-sm text-gray-600">Works like a native app with fast loading and offline browsing support.</p>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Install App
                </button>
                <button
                  onClick={() => setIsInstalled(true)}
                  className="w-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
                >
                  Continue in browser
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">To install on home screen:</p>
                  <ol className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold flex-shrink-0">1.</span>
                      <span>Tap the share button</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold flex-shrink-0">2.</span>
                      <span>Choose &quot;Add to Home Screen&quot;</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold flex-shrink-0">3.</span>
                      <span>Tap &quot;Add&quot; and start using!</span>
                    </li>
                  </ol>
                </div>
                <button
                  onClick={() => setIsInstalled(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom spacing */}
        <div className="flex-1" />
      </div>
    )
  }

  // Mobile - OTP verification
  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Toaster position="top-center" />
        
        {/* Top spacing */}
        <div className="flex-1" />
        
        {/* Content */}
        <div className="px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Enter code
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Check your email at{' '}
              <span className="font-semibold text-gray-900">{sentToEmail}</span>
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-3xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                maxLength={6}
                autoFocus
              />

              <button
                onClick={verifyOtpCode}
                disabled={verifyingOtp || otpCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {verifyingOtp ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setOtpSent(false)
                  setSentToEmail('')
                  setOtpCode('')
                  setEmail('')
                }}
                className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm py-2"
              >
                Try another email
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom spacing */}
        <div className="flex-1" />
      </div>
    )
  }

  // Mobile - magic link sent confirmation
  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Toaster position="top-center" />
        
        {/* Top spacing */}
        <div className="flex-1" />
        
        {/* Content */}
        <div className="px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-600 mb-8">
              We sent a link to{' '}
              <span className="font-semibold text-gray-900">{sentToEmail}</span>
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-sm text-gray-700">
              Click the link in your email to sign in. You can close this page.
            </div>

            <button
              onClick={() => {
                setMagicLinkSent(false)
                setSentToEmail('')
                setEmail('')
              }}
              className="w-full text-blue-600 hover:text-blue-700 font-medium"
            >
              Try another email
            </button>
          </div>
        </div>
        
        {/* Bottom spacing */}
        <div className="flex-1" />
      </div>
    )
  }

  // Mobile - Login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Toaster position="top-center" />
      
      {/* Top spacing */}
      <div className="flex-1" />
      
      {/* Content */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
          
          {/* Heading */}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            EasyGroceries
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Smart inventory tracking
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  Sending...
                </>
              ) : (
                <>
                  Send Sign-In Link
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-6 leading-relaxed">
            We&apos;ll email you a code (PWA) or magic link (browser) for a password-free sign in.
          </p>
        </div>
      </div>
      
      {/* Bottom spacing */}
      <div className="flex-1" />
    </div>
  )
}
