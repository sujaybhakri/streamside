'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient, useSession } from '@/lib/auth-client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

import {
  Video,
  Mail,
  Lock,
  User,
  AlertCircle,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

type AuthMode = 'signin' | 'signup'
const MIN_PASSWORD_LENGTH = 8

function getErrorMessage(error: unknown): { message: string; suggestSignup?: boolean } {
  let msg = 'Something went wrong. Please try again.'

  if (typeof error === 'string') msg = error
  else if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as any).message === 'string') {
      msg = (error as any).message
    }
    if ('code' in error && typeof (error as any).code === 'string') {
      const code = (error as any).code
      if (code === 'USER_NOT_FOUND' || code === 'INVALID_EMAIL_OR_PASSWORD') {
        return { message: 'No account found with this email', suggestSignup: true }
      }
    }
  }

  return { message: msg }
}

function fallbackName(email: string) {
  return email.includes('@') ? email.split('@')[0] : 'Streamside Creator'
}

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] =
    useState<{ message: string; suggestSignup?: boolean } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') ?? '/dashboard'
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && session) {
      router.replace(callbackUrl)
    }
  }, [session, isPending, router, callbackUrl])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        await authClient.signIn.email({
          email,
          password,
          rememberMe,
          callbackURL: callbackUrl,
        })
      } else {
        await authClient.signUp.email({
          name: name.trim() || fallbackName(email),
          email,
          password,
          callbackURL: callbackUrl,
        })
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setLoading(true)
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (isPending && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <Video className="size-6" />
        <span className="text-xl font-medium">Streamside</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-1">
          <h2 className="text-2xl font-semibold">
            {mode === 'signin' ? 'Sign In' : 'Create an Account'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Enter your credentials to access your account'
              : 'Get started with studio-quality recording'}
          </p>
        </div>

        <div className="p-6 pt-0 space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive text-sm flex gap-2">
              <AlertCircle className="size-4 mt-0.5" />
              <div>
                {error.message}
                {error.suggestSignup && mode === 'signin' && (
                  <button
                    onClick={() => setMode('signup')}
                    className="block underline mt-1"
                  >
                    Create an account →
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm"
                  required
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">
                  Must be at least {MIN_PASSWORD_LENGTH} characters
                </p>
              )}
            </div>

            {mode === 'signin' && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Keep me signed in
              </label>
            )}

            <button
              disabled={loading}
              className="h-10 w-full rounded-md bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-medium disabled:opacity-50"
            >
              {loading
                ? 'Working...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-border/50 border-t" />
            <span className="text-xs uppercase text-muted-foreground">
              Or continue with
            </span>
            <span className="flex-1 h-px bg-border/50 border-t" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="h-10 w-full rounded-md border bg-background flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-50"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <p className="text-sm text-center text-muted-foreground mt-6">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-medium text-foreground hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  )
}
