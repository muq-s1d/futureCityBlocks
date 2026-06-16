import { useEffect, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { PALETTE } from '@/constants/palette'
import { isSupabaseConfigured } from '@/lib/supabase'
import { signInWithEmail, signUpWithEmail } from '@/lib/auth'
import { validateAuth, type AuthMode, type FieldErrors } from '@/lib/authValidation'

/**
 * The in-world city-access terminal: a solid concrete monolith planted on the
 * shoulder of the approach highway whose screen carries a fully 3D sign-up /
 * log-in form (no HTML overlay). Fields are real geometry + drei <Text>; the
 * focused field captures keystrokes via a window key listener, so typing,
 * masking, and submit all happen "on the sign".
 *
 * `active` gates input capture (true once the camera is at the terminal). World
 * placement + the matching camera pose live in CityField.
 */

const MONO = '/fonts/ShareTechMono-Regular.ttf'
const DISPLAY = '/fonts/Orbitron.ttf'

const CARET = '▌'
type FieldId = 'username' | 'email' | 'password'

export function AuthKiosk({ active, onSuccess }: { active: boolean; onSuccess: () => void }) {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState<FieldId | null>(null)
  const [caretOn, setCaretOn] = useState(true)

  const busyRef = useRef(false)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  const order: FieldId[] = mode === 'signup' ? ['username', 'email', 'password'] : ['email', 'password']

  const setField = (id: FieldId, fn: (v: string) => string) => {
    if (id === 'username') setUsername(fn)
    else if (id === 'email') setEmail(fn)
    else setPassword(fn)
    setErrors((e) => (e[id] ? { ...e, [id]: undefined } : e))
  }

  const swap = () => {
    setMode((m) => (m === 'signup' ? 'login' : 'signup'))
    setErrors({})
    setFormError(null)
    setPassword('')
    setShowPassword(false)
    setFocused(null)
  }

  const submit = async () => {
    if (busyRef.current || !isSupabaseConfigured) return
    setFormError(null)
    const found = validateAuth(mode, { email, password, username })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const firstErr = order.find((f) => found[f])
      if (firstErr) setFocused(firstErr)
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') await signUpWithEmail(email.trim(), password, username)
      else await signInWithEmail(email.trim(), password)
      onSuccess()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      // Never leave a rejected password sitting in the field.
      setPassword('')
      setShowPassword(false)
      setFocused('password')
    } finally {
      setBusy(false)
    }
  }

  // Keystrokes route to the focused field while the terminal is active.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (busyRef.current) return
      if (e.key === 'Enter') {
        e.preventDefault()
        void submit()
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const cur = focused ? order.indexOf(focused) : -1
        const dir = e.shiftKey ? -1 : 1
        setFocused(order[(cur + dir + order.length) % order.length])
        return
      }
      if (e.key === 'Escape') {
        setFocused(null)
        return
      }
      if (!focused) return
      if (e.key === 'Backspace') {
        e.preventDefault()
        setField(focused, (v) => v.slice(0, -1))
        return
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setField(focused, (v) => v + e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, focused, mode, email, password, username])

  // Reset focus when we leave the terminal.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!active) setFocused(null)
  }, [active])

  // Blink the caret on the focused field.
  useEffect(() => {
    if (!active || !focused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaretOn(false)
      return
    }
    setCaretOn(true)
    const id = window.setInterval(() => setCaretOn((c) => !c), 530)
    return () => window.clearInterval(id)
  }, [active, focused])

  // ── Screen layout (local y, terminal origin at ground) ──
  // Screen spans y≈0.7–11.3 (center 6.0); keep content inside with margin so
  // nothing clips against the bottom neon frame.
  const headerY = 10.5
  const subY = 9.65
  let y = 8.3
  const tabsY = y
  y -= 1.4
  let usernameY: number | null = null
  if (mode === 'signup') {
    usernameY = y
    y -= 1.4
  }
  const emailY = y
  y -= 1.4
  const passwordY = y
  const note = formError ?? (!isSupabaseConfigured ? 'Supabase isn’t configured — auth is disabled.' : null)
  y -= note ? 0.85 : 1.4
  let noteY: number | null = null
  if (note) {
    noteY = y
    y -= 0.7
  }
  const submitY = y
  y -= 1.15
  const swapY = y

  return (
    <group position={[13, 0, 30]} rotation-y={-0.3}>
      {/* ── Concrete monolith ── */}
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[9.6, 12, 1]} />
        <meshStandardMaterial color="#22222b" roughness={0.92} metalness={0.08} />
      </mesh>
      {/* Base plinth */}
      <mesh position={[0, 0.45, 0.25]}>
        <boxGeometry args={[10.4, 0.9, 2]} />
        <meshStandardMaterial color="#181820" roughness={1} metalness={0} />
      </mesh>
      {/* Recessed screen */}
      <mesh position={[0, 6, 0.5]}>
        <boxGeometry args={[8.6, 10.6, 0.08]} />
        <meshStandardMaterial
          color="#070710"
          roughness={0.5}
          metalness={0.1}
          emissive={PALETTE.cyan}
          emissiveIntensity={0.045}
        />
      </mesh>
      <ScreenFrame y={6} w={8.6} h={10.6} z={0.56} />

      {/* ── Screen content ── */}
      <group position={[0, 0, 0.6]}>
        <Text
          font={DISPLAY}
          fontSize={0.82}
          letterSpacing={0.08}
          color={PALETTE.cyan}
          anchorX="center"
          anchorY="middle"
          position={[0, headerY, 0]}
          outlineWidth={0.02}
          outlineColor={PALETTE.void}
        >
          FUTURECITY
        </Text>
        <Text
          font={MONO}
          fontSize={0.32}
          letterSpacing={0.22}
          color={PALETTE.amber}
          anchorX="center"
          anchorY="middle"
          position={[0, subY, 0]}
        >
          ▸ CITY ACCESS · EXIT 01
        </Text>

        {!active ? (
          <Text
            font={MONO}
            fontSize={0.4}
            letterSpacing={0.12}
            color={PALETTE.cyan}
            fillOpacity={0.8}
            anchorX="center"
            anchorY="middle"
            position={[0, 6, 0]}
          >
            ▸ APPROACH TO SIGN IN
          </Text>
        ) : (
          <>
            {/* Mode tabs */}
            <Button3D
              x={-2.15}
              y={tabsY}
              w={4}
              label="SIGN UP"
              color={PALETTE.cyan}
              highlighted={mode === 'signup'}
              onClick={() => mode !== 'signup' && swap()}
            />
            <Button3D
              x={2.15}
              y={tabsY}
              w={4}
              label="LOG IN"
              color={PALETTE.cyan}
              highlighted={mode === 'login'}
              onClick={() => mode !== 'login' && swap()}
            />

            {usernameY !== null && (
              <Field3D
                label="Username (optional)"
                y={usernameY}
                value={username}
                placeholder="defaults to email name"
                focused={focused === 'username'}
                caretOn={caretOn}
                error={errors.username}
                onFocus={() => setFocused('username')}
              />
            )}
            <Field3D
              label="Email"
              y={emailY}
              value={email}
              placeholder="you@grid.io"
              focused={focused === 'email'}
              caretOn={caretOn}
              error={errors.email}
              onFocus={() => setFocused('email')}
            />
            <Field3D
              label="Password"
              y={passwordY}
              value={password}
              placeholder="6+ characters"
              focused={focused === 'password'}
              caretOn={caretOn}
              error={errors.password}
              mask={!showPassword}
              onFocus={() => setFocused('password')}
              trailing={
                <Button3D
                  x={3.05}
                  y={0}
                  w={1.5}
                  h={0.74}
                  fontSize={0.26}
                  label={showPassword ? 'HIDE' : 'SHOW'}
                  color={PALETTE.amber}
                  onClick={() => setShowPassword((s) => !s)}
                />
              }
            />

            {note && noteY !== null && (
              <Text
                font={MONO}
                fontSize={0.3}
                color={formError ? PALETTE.magenta : PALETTE.amber}
                anchorX="center"
                anchorY="middle"
                position={[0, noteY, 0]}
                maxWidth={7.8}
                textAlign="center"
              >
                {note}
              </Text>
            )}

            <Button3D
              x={0}
              y={submitY}
              w={8}
              h={0.95}
              fontSize={0.46}
              label={busy ? 'CONNECTING…' : mode === 'signup' ? 'ENTER THE CITY →' : 'LOG IN →'}
              color={PALETTE.magenta}
              highlighted
              onClick={() => void submit()}
            />

            <Text
              font={MONO}
              fontSize={0.3}
              letterSpacing={0.08}
              color={PALETTE.cyan}
              fillOpacity={0.6}
              anchorX="center"
              anchorY="middle"
              position={[0, swapY, 0]}
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation()
                swap()
              }}
            >
              {mode === 'signup' ? 'Already have an account? Log in' : 'Need an account? Sign up'}
            </Text>
          </>
        )}
      </group>
    </group>
  )
}

interface Field3DProps {
  label: string
  y: number
  value: string
  placeholder: string
  focused: boolean
  caretOn: boolean
  error?: string
  mask?: boolean
  onFocus: () => void
  trailing?: React.ReactNode
}

function Field3D({
  label,
  y,
  value,
  placeholder,
  focused,
  caretOn,
  error,
  mask,
  onFocus,
  trailing,
}: Field3DProps) {
  const showCaret = focused && caretOn
  const shown = mask ? '•'.repeat(value.length) : value
  const isPlaceholder = !value && !showCaret
  const display = isPlaceholder ? placeholder : shown + (showCaret ? CARET : '')
  const lineColor = focused ? PALETTE.cyan : error ? PALETTE.magenta : PALETTE.border

  return (
    <group position={[0, y, 0]}>
      <Text
        font={MONO}
        fontSize={0.26}
        letterSpacing={0.12}
        color={error ? PALETTE.magenta : PALETTE.cyan}
        fillOpacity={0.78}
        anchorX="left"
        anchorY="middle"
        position={[-3.95, 0.68, 0.12]}
      >
        {error ? `${label.toUpperCase()} — ${error}` : label.toUpperCase()}
      </Text>

      {/* Border + field background (border is the slightly larger plate behind) */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[8.16, 0.94, 0.04]} />
        <meshBasicMaterial color={lineColor} toneMapped={false} />
      </mesh>
      <mesh onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onFocus()
      }}>
        <boxGeometry args={[8, 0.8, 0.1]} />
        <meshStandardMaterial
          color="#0b0b14"
          metalness={0.2}
          roughness={0.6}
          emissive={focused ? PALETTE.cyan : '#000000'}
          emissiveIntensity={focused ? 0.12 : 0}
        />
      </mesh>

      <Text
        font={MONO}
        fontSize={0.38}
        color={isPlaceholder ? PALETTE.muted : PALETTE.cyan}
        anchorX="left"
        anchorY="middle"
        position={[-3.7, 0, 0.08]}
        maxWidth={trailing ? 6 : 7.2}
        whiteSpace="nowrap"
      >
        {display || ' '}
      </Text>

      {trailing}
    </group>
  )
}

interface Button3DProps {
  x?: number
  y: number
  w: number
  h?: number
  fontSize?: number
  label: string
  color: string
  highlighted?: boolean
  onClick: () => void
}

function Button3D({
  x = 0,
  y,
  w,
  h = 0.8,
  fontSize = 0.42,
  label,
  color,
  highlighted = false,
  onClick,
}: Button3DProps) {
  const [hover, setHover] = useState(false)
  const intensity = highlighted ? 0.42 : hover ? 0.3 : 0.12

  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.05]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[w, h, 0.14]} />
        <meshStandardMaterial
          color="#0b0b14"
          metalness={0.3}
          roughness={0.5}
          emissive={color}
          emissiveIntensity={intensity}
        />
      </mesh>
      <Text
        font={MONO}
        fontSize={fontSize}
        letterSpacing={0.12}
        color={color}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.1]}
      >
        {label}
      </Text>
    </group>
  )
}

/** Neon rectangle around the terminal screen. */
function ScreenFrame({ y, w, h, z }: { y: number; w: number; h: number; z: number }) {
  const t = 0.14
  return (
    <group position={[0, y, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, t, 0.06]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[0, -h / 2, 0]}>
        <boxGeometry args={[w, t, 0.06]} />
        <meshBasicMaterial color={PALETTE.magenta} toneMapped={false} />
      </mesh>
      <mesh position={[-w / 2, 0, 0]}>
        <boxGeometry args={[t, h, 0.06]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[w / 2, 0, 0]}>
        <boxGeometry args={[t, h, 0.06]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
    </group>
  )
}
