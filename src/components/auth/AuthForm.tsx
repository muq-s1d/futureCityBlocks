import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { NeonButton } from '@/components/ui/NeonButton'
import { isSupabaseConfigured } from '@/lib/supabase'
import { signInWithEmail, signUpWithEmail } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'
import { validateAuth, type AuthMode, type FieldErrors } from '@/lib/authValidation'

type Mode = AuthMode

interface AuthFormProps {
  /** Called after a successful sign in / sign up. Defaults to navigating to /city. */
  onSuccess?: () => void
  className?: string
}

/**
 * The validated email/password sign up + log in card for the standalone /auth
 * route. (The landing flow now uses the in-world 3D AuthKiosk instead.)
 */
export function AuthForm({ onSuccess, className = '' }: AuthFormProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)

  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const succeed = onSuccess ?? (() => navigate('/city', { replace: true }))

  // Already signed in → skip straight through.
  useEffect(() => {
    if (!initializing && user) succeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initializing])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const found = validateAuth(mode, { email, password, username })
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      if (mode === 'signup') await signUpWithEmail(email.trim(), password, username)
      else await signInWithEmail(email.trim(), password)
      succeed()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      // Security + UX: never leave a rejected password in the field.
      setPassword('')
      setShowPassword(false)
    } finally {
      setBusy(false)
    }
  }

  const swap = () => {
    setMode((m) => (m === 'signup' ? 'login' : 'signup'))
    setErrors({})
    setFormError(null)
    setPassword('')
    setShowPassword(false)
  }

  return (
    <form onSubmit={submit} noValidate className={`hud-panel w-full max-w-sm rounded-sm p-7 ${className}`}>
      {/* Mode toggle */}
      <div className="mb-7 grid grid-cols-2 gap-2 font-mono text-xs tracking-widest uppercase">
        {(['signup', 'login'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => mode !== m && swap()}
            className={`border py-2 transition-colors ${
              mode === m
                ? 'border-cyan text-cyan'
                : 'border-border text-muted hover:text-cyan/70'
            }`}
          >
            {m === 'signup' ? 'Sign Up' : 'Log In'}
          </button>
        ))}
      </div>

      {mode === 'signup' && (
        <Field
          label="Username"
          optional
          value={username}
          onChange={(v) => {
            setUsername(v)
            if (errors.username) setErrors((e) => ({ ...e, username: undefined }))
          }}
          type="text"
          autoComplete="username"
          placeholder="defaults to email name"
          error={errors.username}
        />
      )}

      <Field
        label="Email"
        value={email}
        onChange={(v) => {
          setEmail(v)
          if (errors.email) setErrors((e) => ({ ...e, email: undefined }))
        }}
        type="email"
        autoComplete="email"
        placeholder="you@grid.io"
        error={errors.email}
      />

      <Field
        label="Password"
        value={password}
        onChange={(v) => {
          setPassword(v)
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }))
        }}
        type={showPassword ? 'text' : 'password'}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        placeholder="6+ characters"
        error={errors.password}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="text-muted transition-colors hover:text-cyan focus:text-cyan focus:outline-none"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      {formError && (
        <p
          role="alert"
          className="mt-4 border border-magenta/50 bg-magenta/10 px-3 py-2 font-mono text-xs text-magenta"
        >
          {formError}
        </p>
      )}

      {!isSupabaseConfigured && (
        <p className="mt-4 font-mono text-xs text-amber">
          Supabase isn’t configured — auth is disabled.
        </p>
      )}

      <NeonButton
        accent="magenta"
        type="submit"
        disabled={busy || !isSupabaseConfigured}
        className="mt-7 w-full justify-center"
      >
        {busy ? 'Connecting…' : mode === 'signup' ? 'Enter the City →' : 'Log In →'}
      </NeonButton>

      <button
        type="button"
        onClick={swap}
        className="mt-5 w-full text-center font-mono text-xs text-cyan/55 transition-colors hover:text-cyan"
      >
        {mode === 'signup'
          ? 'Already have an account? Log in'
          : 'Need an account? Sign up'}
      </button>
    </form>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type: string
  autoComplete?: string
  placeholder?: string
  optional?: boolean
  error?: string
  trailing?: ReactNode
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  placeholder,
  optional,
  error,
  trailing,
}: FieldProps) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 flex items-center justify-between font-mono text-xs tracking-widest text-cyan/70 uppercase">
        {label}
        {optional && <span className="text-muted normal-case">optional</span>}
      </span>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={`w-full border bg-void/60 px-3 py-2.5 font-mono text-sm text-cyan placeholder:text-muted focus:outline-none ${
            trailing ? 'pr-11' : ''
          } ${
            error
              ? 'border-magenta focus:border-magenta'
              : 'border-border focus:border-cyan focus:shadow-glow-cyan'
          }`}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-3 flex items-center">{trailing}</span>
        )}
      </div>
      {error && <span className="mt-1 block font-mono text-xs text-magenta">{error}</span>}
    </label>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07A3 3 0 1 1 9.88 9.88" />
      <path d="M6.61 6.61A18.5 18.5 0 0 0 1 12s4 8 11 8a9.1 9.1 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
