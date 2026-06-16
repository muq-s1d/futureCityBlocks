/**
 * Shared sign-up / log-in field validation. Consumed by both the standalone
 * /auth DOM form (AuthForm) and the in-world 3D access terminal (AuthKiosk),
 * so the two entry points stay in lock-step.
 */

export type AuthMode = 'login' | 'signup'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_RE = /^[a-zA-Z0-9_]+$/

export interface FieldErrors {
  email?: string
  password?: string
  username?: string
}

export interface AuthValues {
  email: string
  password: string
  username: string
}

export function validateAuth(mode: AuthMode, { email, password, username }: AuthValues): FieldErrors {
  const next: FieldErrors = {}

  if (!email.trim()) next.email = 'Email is required.'
  else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'

  if (!password) next.password = 'Password is required.'
  else if (password.length < 6) next.password = 'Password must be at least 6 characters.'

  if (mode === 'signup' && username.trim()) {
    const u = username.trim()
    if (u.length < 3) next.username = 'Username must be at least 3 characters.'
    else if (u.length > 20) next.username = 'Username must be 20 characters or fewer.'
    else if (!USERNAME_RE.test(u)) next.username = 'Use only letters, numbers, and underscores.'
  }

  return next
}
