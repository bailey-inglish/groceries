'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

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

  // Desktop view - show QR code
  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
        <Toaster position="top-center" />
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Groceries</h1>
          <p className="text-gray-600 mb-8">
            This app is designed for mobile devices. Scan the QR code with your phone to get started.
          </p>
          
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200 mb-6 inline-block">
            <QRCodeSVG value={currentUrl} size={200} level="H" />
          </div>
          
          <p className="text-sm text-gray-500">
            Open the camera app on your phone and point it at the QR code above.
          </p>
        </div>
      </div>
    )
  }

  // Mobile - not installed - show install prompt
  if (!isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
        <Toaster position="top-center" />
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Groceries</h1>
            <p className="text-gray-600">
              Smart grocery inventory management
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-emerald-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-emerald-700">
                    <span className="font-semibold">Install this app</span> for the best experience. It works offline and loads instantly.
                  </p>
                </div>
              </div>
            </div>

            {showInstallPrompt && deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
              >
                📲 Install App
              </button>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2 font-semibold">To install:</p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Tap the Share button <span className="inline-block">⎙</span></li>
                  <li>Select &quot;Add to Home Screen&quot;</li>
                  <li>Tap &quot;Add&quot;</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setIsInstalled(true)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition-all text-sm"
            >
              Continue without installing
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mobile - installed or skipped install - show OTP or magic link confirmation
  if (otpSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
        <Toaster position="top-center" />
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔢</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter verification code</h2>
            <p className="text-gray-600">
              We sent a 6-digit code to <span className="font-semibold">{sentToEmail}</span>
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              maxLength={6}
              autoFocus
            />

            <button
              onClick={verifyOtpCode}
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
            >
              {verifyingOtp ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              onClick={() => {
                setOtpSent(false)
                setSentToEmail('')
                setOtpCode('')
                setEmail('')
              }}
              className="w-full text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
            >
              ← Try a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
        <Toaster position="top-center" />
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We sent a magic link to <span className="font-semibold">{sentToEmail}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to sign in. You can close this page.
          </p>
          <button
            onClick={() => {
              setMagicLinkSent(false)
              setSentToEmail('')
              setEmail('')
            }}
            className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
          >
            ← Try a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <Toaster position="top-center" />
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Groceries</h1>
          <p className="text-gray-600">
            Track your inventory, never run out
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          We&apos;ll email you a magic link for a password-free sign in.
        </p>
      </div>
    </div>
  )
}
